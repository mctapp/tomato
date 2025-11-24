#!/usr/bin/env python3
"""
기존 영화 데이터의 poster_url을 채우는 마이그레이션 스크립트

이 스크립트는 poster_file_id는 있지만 poster_url이 없는 영화들의
poster_url을 file_assets 테이블의 S3 정보를 기반으로 채웁니다.

실행 방법:
    python scripts/migrate_poster_urls.py

옵션:
    --dry-run : 실제 업데이트 없이 변경될 내용만 출력
    --limit N : N개의 레코드만 처리 (테스트용)
"""

import sys
import os
import argparse
from typing import Optional

# 프로젝트 루트를 Python path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.db import get_engine
from app.models.movies import Movie
from app.models.file_assets import FileAsset
from app.config import settings


def build_s3_url(s3_key: str, is_public: bool) -> str:
    """S3 키와 공개 여부로부터 전체 S3 URL 생성"""
    bucket_name = settings.PUBLIC_BUCKET_NAME if is_public else settings.PRIVATE_BUCKET_NAME
    region = settings.AWS_REGION
    return f"https://{bucket_name}.s3.{region}.amazonaws.com/{s3_key}"


def migrate_poster_urls(dry_run: bool = False, limit: Optional[int] = None) -> dict:
    """
    poster_file_id는 있지만 poster_url이 없는 영화들의 poster_url을 채움

    Args:
        dry_run: True일 경우 실제 업데이트하지 않고 로그만 출력
        limit: 처리할 최대 레코드 수 (None이면 전체)

    Returns:
        처리 결과 통계
    """
    engine = get_engine()

    stats = {
        'total_checked': 0,
        'needs_update': 0,
        'updated': 0,
        'failed': 0,
        'skipped_no_file_asset': 0,
        'skipped_not_public': 0
    }

    with Session(engine) as session:
        # poster_file_id는 있지만 poster_url이 없는 영화들 조회
        query = select(Movie).where(
            Movie.poster_file_id.isnot(None),
            Movie.poster_url.is_(None)
        )

        if limit:
            query = query.limit(limit)

        movies = session.exec(query).all()
        stats['total_checked'] = len(movies)

        print(f"\n{'=' * 70}")
        print(f"{'[DRY RUN] ' if dry_run else ''}포스터 URL 마이그레이션 시작")
        print(f"{'=' * 70}")
        print(f"처리 대상: {stats['total_checked']}개 영화\n")

        for movie in movies:
            stats['needs_update'] += 1

            # FileAsset 조회
            file_asset = session.get(FileAsset, movie.poster_file_id)

            if not file_asset:
                print(f"⚠️  영화 ID {movie.id} ({movie.title}): FileAsset {movie.poster_file_id}를 찾을 수 없음")
                stats['skipped_no_file_asset'] += 1
                continue

            if not file_asset.is_public:
                print(f"⏩  영화 ID {movie.id} ({movie.title}): 포스터가 private 파일임 (건너뜀)")
                stats['skipped_not_public'] += 1
                continue

            # S3 URL 생성
            poster_url = build_s3_url(file_asset.s3_key, file_asset.is_public)

            print(f"✓  영화 ID {movie.id} ({movie.title[:30]}...)")
            print(f"   - File Asset ID: {file_asset.id}")
            print(f"   - S3 Key: {file_asset.s3_key}")
            print(f"   - URL: {poster_url}")

            if not dry_run:
                try:
                    movie.poster_url = poster_url
                    session.add(movie)
                    session.commit()
                    stats['updated'] += 1
                    print(f"   → 업데이트 완료")
                except Exception as e:
                    session.rollback()
                    stats['failed'] += 1
                    print(f"   ✗ 업데이트 실패: {e}")

            print()

    # 결과 출력
    print(f"\n{'=' * 70}")
    print("마이그레이션 완료")
    print(f"{'=' * 70}")
    print(f"총 확인: {stats['total_checked']}개")
    print(f"업데이트 대상: {stats['needs_update']}개")

    if not dry_run:
        print(f"✓ 성공: {stats['updated']}개")
        print(f"✗ 실패: {stats['failed']}개")

    print(f"⏩ FileAsset 없음: {stats['skipped_no_file_asset']}개")
    print(f"⏩ Private 파일: {stats['skipped_not_public']}개")
    print(f"{'=' * 70}\n")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description='기존 영화 데이터의 poster_url을 마이그레이션합니다.'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='실제 업데이트 없이 변경될 내용만 출력'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='처리할 최대 레코드 수 (테스트용)'
    )

    args = parser.parse_args()

    if args.dry_run:
        print("\n⚠️  DRY RUN 모드: 실제로 데이터베이스를 변경하지 않습니다.\n")

    stats = migrate_poster_urls(dry_run=args.dry_run, limit=args.limit)

    # 종료 코드 결정
    if stats['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
