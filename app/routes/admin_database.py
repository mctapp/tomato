# app/routes/admin_database.py

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Response, Body
from sqlmodel import Session, select
from app.db import get_session
import subprocess
import os
from datetime import datetime, time, timedelta
import shutil
from pathlib import Path
import sqlalchemy as sa
from typing import Optional, List
import tempfile
import asyncio
import schedule
import threading
import time as py_time
from pydantic import BaseModel
from app.models.db_backup import DBBackup, ScheduledBackup
from app.config import settings  # 설정 모듈 import

router = APIRouter(prefix="/api/admin/database", tags=["admin-database"])

# 백업 디렉토리 설정
BACKUP_DIR = Path("db_backups")
BACKUP_DIR.mkdir(exist_ok=True, parents=True)

# 스케줄 백업 처리를 위한 전역 이벤트 루프
backup_scheduler_running = False

# 스케줄 백업 요청 모델
class ScheduleBackupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    schedule_type: str  # daily, weekly, monthly
    hour: int
    minute: int
    day_of_week: Optional[int] = None  # weekly용, 0-6 (월-일)
    day_of_month: Optional[int] = None  # monthly용, 1-31

# 백업 생성 함수 (재사용 가능하게 분리)
def create_backup_file(description: Optional[str] = None) -> tuple:
    """백업 파일을 생성하고 결과를 반환합니다."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"tomato_db-backup_{timestamp}.sql"
    backup_path = BACKUP_DIR / filename
    
    print(f"백업 시작: {filename}, 설명: {description}")
    
    try:
        # PostgreSQL 백업 명령 실행 (settings 모듈 사용)
        result = subprocess.run([
            "pg_dump",
            f"--host={settings.DB_HOST}",
            f"--port={settings.DB_PORT}",
            f"--username={settings.DB_USER}",
            f"--dbname={settings.DB_NAME}",
            "-f", str(backup_path)
        ], env={**os.environ, "PGPASSWORD": settings.DB_PASSWORD.get_secret_value()}, 
           check=True, capture_output=True)
        
        print(f"백업 명령 완료, 결과 코드: {result.returncode}")
        
        if backup_path.exists():
            file_size = backup_path.stat().st_size
            print(f"백업 파일 생성됨: {backup_path}, 크기: {file_size} 바이트")
            return filename, file_size
        else:
            print(f"오류: 백업 파일이 생성되지 않았습니다: {backup_path}")
            raise Exception("백업 파일이 생성되지 않았습니다.")
        
    except Exception as e:
        # 에러 로깅 및 실패 시 파일 정리
        print(f"백업 실패: {e}")
        if 'result' in locals() and hasattr(result, 'stderr'):
            print(f"백업 오류 출력: {result.stderr.decode()}")
        if backup_path.exists():
            backup_path.unlink()
            print(f"실패한 백업 파일 삭제: {backup_path}")
        raise e

# 예약된 백업 작업 실행 함수
def run_scheduled_backup():
    # 새 세션 생성 (백그라운드 스레드용)
    from app.db import engine
    from sqlmodel import Session
    
    with Session(engine) as db:
        try:
            # 현재 활성화된 모든 스케줄 백업 조회
            scheduled_backups = db.exec(
                select(ScheduledBackup).where(ScheduledBackup.is_active == True)
            ).all()
            
            current_time = datetime.now()
            
            for backup_config in scheduled_backups:
                # 현재 시간과 백업 일정 비교해서 실행 여부 결정
                should_run = False
                
                # 일별 백업 (매일 지정된 시간)
                if backup_config.schedule_type == "daily":
                    # 현재 시간과 설정된 백업 시간이 일치하는지 확인
                    if (current_time.hour == backup_config.hour and 
                        current_time.minute == backup_config.minute):
                        should_run = True
                
                # 주별 백업 (지정된 요일의 지정된 시간)
                elif backup_config.schedule_type == "weekly" and backup_config.day_of_week is not None:
                    # 현재 요일과 설정된 요일이 일치하고, 시간도 일치하는지 확인
                    if (current_time.weekday() == backup_config.day_of_week and 
                        current_time.hour == backup_config.hour and 
                        current_time.minute == backup_config.minute):
                        should_run = True
                
                # 월별 백업 (지정된 날짜의 지정된 시간)
                elif backup_config.schedule_type == "monthly" and backup_config.day_of_month is not None:
                    # 현재 날짜와 설정된 날짜가 일치하고, 시간도 일치하는지 확인
                    if (current_time.day == backup_config.day_of_month and 
                        current_time.hour == backup_config.hour and 
                        current_time.minute == backup_config.minute):
                        should_run = True
                
                if should_run:
                    print(f"예약된 백업 실행: {backup_config.name}")
                    try:
                        # 백업 생성
                        filename, file_size = create_backup_file(
                            description=f"스케줄 백업: {backup_config.name} - {backup_config.description}"
                        )
                        
                        # 백업 메타데이터 저장
                        db_backup = DBBackup(
                            filename=filename,
                            description=backup_config.description,
                            created_at=datetime.now(),
                            size_bytes=file_size,
                            scheduled_backup_id=backup_config.id
                        )
                        db.add(db_backup)
                        db.commit()
                        print(f"스케줄 백업 완료: {filename}")
                        
                        # 마지막 실행 시간 업데이트
                        backup_config.last_run = current_time
                        db.add(backup_config)
                        db.commit()
                    except Exception as e:
                        print(f"스케줄 백업 실패: {e}")
                        
        except Exception as e:
            print(f"스케줄 백업 처리 중 오류: {e}")

# 백업 스케줄러 쓰레드 함수
def run_backup_scheduler():
    global backup_scheduler_running
    
    if backup_scheduler_running:
        return
        
    backup_scheduler_running = True
    
    try:
        print("백업 스케줄러 시작됨")
        while backup_scheduler_running:
            # 예약된 백업 확인 및 실행 (매 분 체크)
            run_scheduled_backup()
            py_time.sleep(60)  # 1분마다 체크
    except Exception as e:
        print(f"백업 스케줄러 오류: {e}")
    finally:
        backup_scheduler_running = False
        print("백업 스케줄러 종료됨")

# 애플리케이션 시작 시 백업 스케줄러 시작
scheduler_thread = threading.Thread(target=run_backup_scheduler, daemon=True)
scheduler_thread.start()

@router.post("/backup")
async def create_backup(
    background_tasks: BackgroundTasks,
    description: Optional[str] = None,
    db: Session = Depends(get_session)
):
    """DB 백업을 생성합니다."""
    
    # 설명이 None인지 확인 - FastAPI가 빈 문자열을 None으로 처리할 수 있음
    if description == "":
        description = None
    
    print(f"백업 요청 받음, 설명: {description}")
    
    def perform_backup():
        try:
            # 백업 생성
            filename, file_size = create_backup_file(description)
            
            # 백업 메타데이터 저장
            db_backup = DBBackup(
                filename=filename,
                description=description,  # description 값 저장
                created_at=datetime.now(),
                size_bytes=file_size
            )
            
            print(f"생성할 DB 백업 정보: {filename}, 설명: {description}, 크기: {file_size} 바이트")
            db.add(db_backup)
            db.commit()
            db.refresh(db_backup)  # ID 값을 확인하기 위해 refresh
            print(f"백업 정보 DB 저장 완료: ID={db_backup.id}, 파일명={filename}, 설명={db_backup.description}")
        except Exception as e:
            print(f"백업 작업 실패: {e}")
            raise e
    
    # 백그라운드에서 백업 실행
    background_tasks.add_task(perform_backup)
    return {"message": "백업이 시작되었습니다.", "filename": f"tomato_db-backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"}

@router.get("/backups")
async def list_backups(db: Session = Depends(get_session)):
    """기존 백업 목록을 조회합니다."""
    backups = db.exec(select(DBBackup).order_by(DBBackup.created_at.desc())).all()
    
    return {
        "backups": [
            {
                "id": backup.id,
                "filename": backup.filename,
                "description": backup.description,
                "created_at": backup.created_at,
                "size_mb": round(backup.size_bytes / (1024 * 1024), 2),
                "scheduled_backup_id": backup.scheduled_backup_id
            }
            for backup in backups
        ]
    }

# 최근 3일치 백업만 조회하는 API
@router.get("/recent-backups")
async def get_recent_backups(db: Session = Depends(get_session)):
    """최근 3일치 백업을 조회합니다."""
    three_days_ago = datetime.now() - timedelta(days=3)
    
    # 최근 3일 이내 백업만 조회
    recent_backups = db.exec(
        select(DBBackup)
        .where(DBBackup.created_at >= three_days_ago)
        .order_by(DBBackup.created_at.desc())
    ).all()
    
    return {
        "backups": [
            {
                "id": backup.id,
                "filename": backup.filename,
                "description": backup.description,
                "created_at": backup.created_at,
                "size_mb": round(backup.size_bytes / (1024 * 1024), 2),
                "scheduled_backup_id": backup.scheduled_backup_id
            }
            for backup in recent_backups
        ]
    }

@router.get("/backups/{backup_id}/download")
async def download_backup(backup_id: int, db: Session = Depends(get_session)):
    """백업 파일을 다운로드합니다."""
    backup = db.get(DBBackup, backup_id)
    
    if not backup:
        raise HTTPException(status_code=404, detail="백업을 찾을 수 없습니다.")
    
    backup_path = BACKUP_DIR / backup.filename
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="백업 파일을 찾을 수 없습니다.")
    
    with open(backup_path, "rb") as f:
        file_content = f.read()
    
    return Response(
        content=file_content,
        media_type="application/sql",
        headers={"Content-Disposition": f"attachment; filename={backup.filename}"}
    )

@router.delete("/backups/{backup_id}")
async def delete_backup(backup_id: int, db: Session = Depends(get_session)):
    """백업을 삭제합니다."""
    backup = db.get(DBBackup, backup_id)
    
    if not backup:
        raise HTTPException(status_code=404, detail="백업을 찾을 수 없습니다.")
    
    # 파일 시스템에서 백업 파일 삭제
    backup_path = BACKUP_DIR / backup.filename
    try:
        if backup_path.exists():
            backup_path.unlink()
            print(f"백업 파일 삭제됨: {backup_path}")
    except Exception as e:
        print(f"백업 파일 삭제 중 오류: {e}")
        # 파일 삭제가 실패해도 DB에서는 삭제 진행
    
    # DB에서 백업 정보 삭제
    db.delete(backup)
    db.commit()
    
    return {"message": f"백업 ID {backup_id}가 삭제되었습니다."}

# 예약 백업 관련 API
@router.post("/scheduled-backups")
async def create_scheduled_backup(
    backup_data: ScheduleBackupRequest, 
    db: Session = Depends(get_session)
):
    """예약 백업을 생성합니다."""
    # 입력 데이터 검증
    if backup_data.schedule_type == "weekly" and backup_data.day_of_week is None:
        raise HTTPException(status_code=400, detail="주간 백업에는 요일(day_of_week)이 필요합니다.")
    
    if backup_data.schedule_type == "monthly" and backup_data.day_of_month is None:
        raise HTTPException(status_code=400, detail="월간 백업에는 일자(day_of_month)가 필요합니다.")
    
    # 시간, 분 검증
    if not (0 <= backup_data.hour < 24):
        raise HTTPException(status_code=400, detail="시간(hour)은 0-23 사이여야 합니다.")
    
    if not (0 <= backup_data.minute < 60):
        raise HTTPException(status_code=400, detail="분(minute)은 0-59 사이여야 합니다.")
    
    # 요일, 일자 검증
    if backup_data.day_of_week is not None and not (0 <= backup_data.day_of_week <= 6):
        raise HTTPException(status_code=400, detail="요일(day_of_week)은 0-6 사이여야 합니다. (0:월요일, 6:일요일)")
    
    if backup_data.day_of_month is not None and not (1 <= backup_data.day_of_month <= 31):
        raise HTTPException(status_code=400, detail="일자(day_of_month)는 1-31 사이여야 합니다.")
    
    # 새 예약 백업 생성
    scheduled_backup = ScheduledBackup(
        name=backup_data.name,
        description=backup_data.description,
        schedule_type=backup_data.schedule_type,
        hour=backup_data.hour,
        minute=backup_data.minute,
        day_of_week=backup_data.day_of_week,
        day_of_month=backup_data.day_of_month,
        is_active=True,
        created_at=datetime.now()
    )
    
    db.add(scheduled_backup)
    db.commit()
    db.refresh(scheduled_backup)
    
    return {
        "id": scheduled_backup.id,
        "name": scheduled_backup.name,
        "schedule_type": scheduled_backup.schedule_type,
        "message": "예약 백업이 생성되었습니다."
    }

@router.get("/scheduled-backups")
async def list_scheduled_backups(db: Session = Depends(get_session)):
    """예약된 백업 목록을 조회합니다."""
    scheduled_backups = db.exec(select(ScheduledBackup).order_by(ScheduledBackup.created_at.desc())).all()
    
    result = []
    for backup in scheduled_backups:
        schedule_info = f"{backup.hour:02d}:{backup.minute:02d}"
        
        if backup.schedule_type == "weekly" and backup.day_of_week is not None:
            days = ["월", "화", "수", "목", "금", "토", "일"]
            schedule_info = f"매주 {days[backup.day_of_week]}요일 {schedule_info}"
        elif backup.schedule_type == "monthly" and backup.day_of_month is not None:
            schedule_info = f"매월 {backup.day_of_month}일 {schedule_info}"
        else:
            schedule_info = f"매일 {schedule_info}"
        
        result.append({
            "id": backup.id,
            "name": backup.name,
            "description": backup.description,
            "schedule_type": backup.schedule_type,
            "schedule_info": schedule_info,
            "is_active": backup.is_active,
            "created_at": backup.created_at,
            "last_run": backup.last_run
        })
    
    return {"scheduled_backups": result}

@router.put("/scheduled-backups/{schedule_id}/toggle")
async def toggle_scheduled_backup(schedule_id: int, db: Session = Depends(get_session)):
    """예약 백업의 활성화 상태를 토글합니다."""
    scheduled_backup = db.get(ScheduledBackup, schedule_id)
    
    if not scheduled_backup:
        raise HTTPException(status_code=404, detail="예약 백업을 찾을 수 없습니다.")
    
    # 활성화 상태 토글
    scheduled_backup.is_active = not scheduled_backup.is_active
    db.add(scheduled_backup)
    db.commit()
    
    status = "활성화" if scheduled_backup.is_active else "비활성화"
    return {"message": f"예약 백업이 {status}되었습니다.", "is_active": scheduled_backup.is_active}

@router.delete("/scheduled-backups/{schedule_id}")
async def delete_scheduled_backup(schedule_id: int, db: Session = Depends(get_session)):
    """예약 백업을 삭제합니다."""
    scheduled_backup = db.get(ScheduledBackup, schedule_id)
    
    if not scheduled_backup:
        raise HTTPException(status_code=404, detail="예약 백업을 찾을 수 없습니다.")
    
    # DB에서 예약 백업 삭제
    db.delete(scheduled_backup)
    db.commit()
    
    return {"message": f"예약 백업 ID {schedule_id}가 삭제되었습니다."}

@router.get("/tables")
async def list_tables(db: Session = Depends(get_session)):
    """DB의 모든 테이블 목록과 기본 통계를 조회합니다."""
    # 테이블 목록 조회
    tables = db.exec(sa.text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)).fetchall()
    
    table_stats = []
    for table in tables:
        table_name = table.table_name
        # 각 테이블의 행 수와 크기 조회 - 명시적 타입 캐스팅 추가
        stats = db.exec(sa.text(f"""
            SELECT
                (SELECT COUNT(*) FROM "{table_name}") as row_count,
                pg_size_pretty(pg_total_relation_size('{table_name}'::regclass)) as size,
                pg_total_relation_size('{table_name}'::regclass) as bytes
        """)).first()
        
        table_stats.append({
            "table_name": table_name,
            "row_count": stats.row_count,
            "size": stats.size,
            "bytes": stats.bytes
        })
    
    return {"tables": table_stats}

@router.get("/tables/{table_name}/stats")
async def get_table_stats(table_name: str, db: Session = Depends(get_session)):
    """특정 테이블의 상세 통계를 조회합니다."""
    # 테이블 존재 확인
    exists = db.exec(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :table_name
        )
    """), {"table_name": table_name}).scalar()
    
    if not exists:
        raise HTTPException(status_code=404, detail=f"테이블 '{table_name}'을 찾을 수 없습니다.")
    
    # 테이블 통계 조회 - 명시적 타입 캐스팅 추가
    stats = db.exec(sa.text(f"""
        SELECT
            (SELECT COUNT(*) FROM "{table_name}") as row_count,
            pg_size_pretty(pg_total_relation_size('{table_name}'::regclass)) as size,
            pg_total_relation_size('{table_name}'::regclass) as bytes
    """)).first()
    
    # 테이블 스키마 정보 조회
    columns = db.exec(sa.text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = :table_name
        ORDER BY ordinal_position
    """), {"table_name": table_name}).fetchall()
    
    # 추가 통계 (가능한 경우 최근 업데이트)
    last_update = None
    try:
        update_result = db.exec(sa.text(f"""
            SELECT MAX(updated_at) as last_update 
            FROM "{table_name}"
            WHERE updated_at IS NOT NULL
        """)).first()
        if update_result and update_result.last_update:
            last_update = update_result.last_update
    except:
        # updated_at 컬럼이 없는 경우 무시
        pass
    
    # 테이블 인덱스 정보 - 명시적 타입 캐스팅 추가
    indexes = db.exec(sa.text(f"""
        SELECT
            i.relname as index_name,
            array_to_string(array_agg(a.attname), ', ') as column_names,
            ix.indisunique as is_unique
        FROM
            pg_class t,
            pg_class i,
            pg_index ix,
            pg_attribute a
        WHERE
            t.oid = ix.indrelid
            AND i.oid = ix.indexrelid
            AND a.attrelid = t.oid
            AND a.attnum = ANY(ix.indkey)
            AND t.relkind = 'r'
            AND t.relname = '{table_name}'
        GROUP BY
            i.relname,
            ix.indisunique
        ORDER BY
            i.relname;
    """)).fetchall()
    
    return {
        "table_name": table_name,
        "stats": {
            "row_count": stats.row_count,
            "size": stats.size,
            "bytes": stats.bytes,
            "last_update": last_update
        },
        "columns": [
            {
                "name": col.column_name,
                "type": col.data_type,
                "nullable": col.is_nullable == 'YES'
            }
            for col in columns
        ],
        "indexes": [
            {
                "name": idx.index_name,
                "columns": idx.column_names,
                "unique": idx.is_unique
            }
            for idx in indexes
        ]
    }

@router.get("/summary")
async def get_db_summary(db: Session = Depends(get_session)):
    """데이터베이스 요약 정보를 조회합니다."""
    # 총 테이블 수
    table_count = db.exec(sa.text("""
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)).scalar()
    
    # DB 전체 크기
    db_size = db.exec(sa.text("""
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as bytes
    """)).first()
    
    # 가장 큰 테이블 5개 - 명시적 타입 캐스팅 추가
    largest_tables = db.exec(sa.text("""
        SELECT
            table_name,
            pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
            pg_total_relation_size(table_name::regclass) as bytes
        FROM
            information_schema.tables
        WHERE
            table_schema = 'public'
            AND table_type = 'BASE TABLE'
        ORDER BY
            pg_total_relation_size(table_name::regclass) DESC
        LIMIT 5
    """)).fetchall()
    
    # 가장 많은 행을 가진 테이블 5개
    tables = db.exec(sa.text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)).fetchall()
    
    # 각 테이블의 행 수 계산
    table_rows = []
    for table in tables:
        try:
            row_count = db.exec(sa.text(f'SELECT COUNT(*) FROM "{table.table_name}"')).scalar()
            table_rows.append({"table_name": table.table_name, "row_count": row_count})
        except:
            # 일부 테이블은 COUNT 쿼리가 실패할 수 있음 (예: 권한 없음)
            continue
    
    # 행 수 기준으로 정렬 후 상위 5개 선택
    table_rows.sort(key=lambda x: x["row_count"], reverse=True)
    largest_by_rows = table_rows[:5]
    
    return {
        "table_count": table_count,
        "database_size": {
            "pretty": db_size.size,
            "bytes": db_size.bytes
        },
        "largest_tables": [
            {
                "table_name": table.table_name,
                "size": table.size,
                "bytes": table.bytes
            }
            for table in largest_tables
        ],
        "most_rows": largest_by_rows
    }
