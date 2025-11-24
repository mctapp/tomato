# scripts/initialize_production_templates.py
"""
기본 제작 템플릿 데이터를 데이터베이스에 삽입하는 스크립트
"""
import sys
import os
import argparse
import traceback
from typing import Dict, List, Any
from datetime import datetime

# PYTHONPATH 설정 - 프로젝트 루트 디렉토리 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, select
from app.services.production_template_service import ProductionTemplateService
from app.models.production_template import ProductionTemplate
from app.db import get_database_url


class TemplateInitializer:
    """템플릿 초기화 클래스"""
    
    def __init__(self, engine):
        self.engine = engine
        self.stats = {
            'created': 0,
            'updated': 0,
            'deleted': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def initialize_templates(self, mode: str = "safe", force_clean: bool = False) -> Dict[str, Any]:
        """
        기본 템플릿 초기화 실행
        
        Args:
            mode: 초기화 모드 ("safe", "overwrite", "clean")
            force_clean: 기존 데이터 강제 삭제 여부
        """
        session = None
        
        try:
            session = Session(self.engine)
            service = ProductionTemplateService(session)
            
            print(f"🎬 접근성 미디어 제작 템플릿 초기화 시작... (모드: {mode})")
            print(f"📅 실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # 기존 데이터 처리
            if mode == "clean" or force_clean:
                self._clean_existing_templates(session, service)
            elif mode == "overwrite":
                self._prepare_overwrite_mode(session, service)
            
            # 템플릿 초기화 실행
            if mode == "safe":
                self._safe_initialize(service)
            else:
                self._force_initialize(service)
            
            # 결과 검증 및 출력
            self._verify_and_report_results(service)
            
            print("✅ 기본 템플릿 초기화 완료!")
            return self._get_summary_report(service)
            
        except Exception as e:
            print(f"❌ 템플릿 초기화 실패: {e}")
            print("\n📋 상세 오류 정보:")
            traceback.print_exc()
            
            if session:
                try:
                    session.rollback()
                    print("🔄 세션 롤백 완료")
                except Exception as rollback_error:
                    print(f"❌ 롤백 실패: {rollback_error}")
            
            self.stats['errors'] += 1
            raise
            
        finally:
            # 세션 안전 종료 보장
            if session:
                try:
                    session.close()
                    print("🔌 데이터베이스 세션 종료")
                except Exception as close_error:
                    print(f"⚠️ 세션 종료 중 오류: {close_error}")
    
    def _clean_existing_templates(self, session: Session, service: ProductionTemplateService) -> None:
        """기존 템플릿 완전 삭제"""
        print("🧹 기존 템플릿 데이터 정리 중...")
        
        try:
            # 모든 템플릿 조회 (is_active 무관)
            all_templates = session.exec(select(ProductionTemplate)).all()
            deleted_count = len(all_templates)
            
            if deleted_count > 0:
                # 물리적 삭제
                for template in all_templates:
                    session.delete(template)
                
                session.commit()
                self.stats['deleted'] = deleted_count
                print(f"🗑️ 기존 템플릿 {deleted_count}개 삭제 완료")
            else:
                print("📝 삭제할 기존 템플릿이 없습니다")
                
        except Exception as e:
            print(f"⚠️ 기존 템플릿 정리 중 오류: {e}")
            session.rollback()
            raise
    
    def _prepare_overwrite_mode(self, session: Session, service: ProductionTemplateService) -> None:
        """덮어쓰기 모드 준비"""
        print("🔄 덮어쓰기 모드: 기존 템플릿 비활성화 중...")
        
        try:
            # 모든 활성 템플릿 비활성화
            active_templates = session.exec(
                select(ProductionTemplate).where(ProductionTemplate.is_active == True)
            ).all()
            
            deactivated_count = 0
            for template in active_templates:
                template.is_active = False
                deactivated_count += 1
            
            if deactivated_count > 0:
                session.commit()
                print(f"⏸️ 기존 활성 템플릿 {deactivated_count}개 비활성화 완료")
            
        except Exception as e:
            print(f"⚠️ 덮어쓰기 모드 준비 중 오류: {e}")
            session.rollback()
            raise
    
    def _safe_initialize(self, service: ProductionTemplateService) -> None:
        """안전 모드 초기화 (기존 데이터 보존)"""
        print("🛡️ 안전 모드: 기존 템플릿이 있는 미디어 타입은 건너뛰기")
        
        for media_type in service.get_all_media_types():
            try:
                existing_templates = service.get_templates_by_media_type(media_type)
                
                if existing_templates:
                    print(f"⏭️ {service.get_media_type_name(media_type)} ({media_type}): 기존 템플릿 존재, 건너뛰기")
                    self.stats['skipped'] += len(existing_templates)
                else:
                    self._initialize_media_type_templates(service, media_type)
                    
            except Exception as e:
                print(f"⚠️ {media_type} 템플릿 처리 중 오류: {e}")
                self.stats['errors'] += 1
                continue
    
    def _force_initialize(self, service: ProductionTemplateService) -> None:
        """강제 초기화 (모든 미디어 타입)"""
        print("💪 강제 모드: 모든 미디어 타입 템플릿 생성")
        
        try:
            service.initialize_default_templates()
            
            # 생성된 템플릿 수 계산
            for media_type in service.get_all_media_types():
                templates = service.get_templates_by_media_type(media_type)
                self.stats['created'] += len(templates)
                
        except Exception as e:
            print(f"⚠️ 강제 초기화 중 오류: {e}")
            self.stats['errors'] += 1
            raise
    
    def _initialize_media_type_templates(self, service: ProductionTemplateService, media_type: str) -> None:
        """특정 미디어 타입의 템플릿 초기화"""
        try:
            default_templates = service._get_default_templates()
            
            if media_type not in default_templates:
                print(f"⚠️ {media_type}: 기본 템플릿 데이터 없음")
                return
            
            stages = default_templates[media_type]
            created_count = 0
            
            for stage_num, tasks in stages.items():
                for task_order, task_data in enumerate(tasks, 1):
                    try:
                        template_data = self._prepare_template_data(media_type, stage_num, task_order, task_data)
                        service.create_template(template_data)
                        created_count += 1
                        
                    except Exception as e:
                        print(f"⚠️ {media_type} 단계{stage_num} 작업{task_order} 생성 실패: {e}")
                        self.stats['errors'] += 1
                        continue
            
            self.stats['created'] += created_count
            print(f"✨ {service.get_media_type_name(media_type)} ({media_type}): {created_count}개 템플릿 생성")
            
        except Exception as e:
            print(f"⚠️ {media_type} 템플릿 초기화 실패: {e}")
            self.stats['errors'] += 1
            raise
    
    def _prepare_template_data(self, media_type: str, stage_num: int, task_order: int, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """템플릿 데이터 준비"""
        from decimal import Decimal
        import json
        
        # 기본 시간 계산
        speed_b_hours = Decimal(str(task_data.get("speed_b_hours", 8.0)))
        speed_a_hours = Decimal(str(task_data.get("speed_a_hours", speed_b_hours * Decimal('0.8'))))
        speed_c_hours = Decimal(str(task_data.get("speed_c_hours", speed_b_hours * Decimal('1.3'))))
        
        template_data = {
            'media_type': media_type,
            'stage_number': stage_num,
            'task_name': task_data.get("name", f"작업 {task_order}"),
            'task_order': task_order,
            'speed_a_hours': speed_a_hours,
            'speed_b_hours': speed_b_hours,
            'speed_c_hours': speed_c_hours,
            'requires_review': task_data.get("requires_review", False),
            'review_hours_a': Decimal(str(task_data.get("review_hours_a", 0.0))),
            'review_hours_b': Decimal(str(task_data.get("review_hours_b", 0.0))),
            'review_hours_c': Decimal(str(task_data.get("review_hours_c", 0.0))),
            'requires_monitoring': task_data.get("requires_monitoring", False),
            'monitoring_hours_a': Decimal(str(task_data.get("monitoring_hours_a", 0.0))),
            'monitoring_hours_b': Decimal(str(task_data.get("monitoring_hours_b", 0.0))),
            'monitoring_hours_c': Decimal(str(task_data.get("monitoring_hours_c", 0.0))),
            'is_required': task_data.get("is_required", True),
            'is_parallel': task_data.get("is_parallel", False),
            'prerequisite_tasks': json.dumps(task_data.get("prerequisite_tasks", []), ensure_ascii=False),
            'quality_checklist': json.dumps(task_data.get("quality_checklist", []), ensure_ascii=False),
            'acceptance_criteria': task_data.get("acceptance_criteria", ""),
            'is_active': True
        }
        
        return template_data
    
    def _verify_and_report_results(self, service: ProductionTemplateService) -> None:
        """결과 검증 및 리포트"""
        print("\n📊 초기화 결과 검증:")
        
        total_templates = 0
        for media_type in service.get_all_media_types():
            try:
                templates = service.get_templates_by_media_type(media_type)
                template_count = len(templates)
                total_templates += template_count
                
                media_name = service.get_media_type_name(media_type)
                print(f"📋 {media_name} ({media_type}): {template_count}개")
                
                # 단계별 분포 확인
                stage_distribution = {}
                for template in templates:
                    stage = template.stage_number
                    stage_distribution[stage] = stage_distribution.get(stage, 0) + 1
                
                stage_info = ", ".join([f"단계{k}: {v}개" for k, v in sorted(stage_distribution.items())])
                print(f"   └── {stage_info}")
                
            except Exception as e:
                print(f"⚠️ {media_type} 검증 중 오류: {e}")
                self.stats['errors'] += 1
        
        print(f"\n📈 총 템플릿 수: {total_templates}개")
    
    def _get_summary_report(self, service: ProductionTemplateService) -> Dict[str, Any]:
        """요약 리포트 생성"""
        return {
            'timestamp': datetime.now().isoformat(),
            'statistics': self.stats.copy(),
            'media_types': {
                media_type: {
                    'name': service.get_media_type_name(media_type),
                    'template_count': len(service.get_templates_by_media_type(media_type))
                }
                for media_type in service.get_all_media_types()
            }
        }


def initialize_templates(mode: str = "safe", force_clean: bool = False) -> Dict[str, Any]:
    """
    기본 템플릿 초기화 실행
    
    Args:
        mode: 초기화 모드
            - "safe": 기존 템플릿이 있으면 건너뛰기 (기본값)
            - "overwrite": 기존 템플릿 비활성화 후 새로 생성
            - "clean": 기존 템플릿 완전 삭제 후 새로 생성
        force_clean: 강제 삭제 여부
    
    Returns:
        초기화 결과 요약
    """
    engine = None
    
    try:
        # 데이터베이스 연결
        database_url = get_database_url()
        engine = create_engine(database_url, echo=False)
        
        # 연결 테스트
        with Session(engine) as test_session:
            test_session.exec(select(1)).first()
        
        print(f"🔌 데이터베이스 연결 성공: {database_url.split('@')[-1] if '@' in database_url else 'Local DB'}")
        
        # 초기화 실행
        initializer = TemplateInitializer(engine)
        result = initializer.initialize_templates(mode=mode, force_clean=force_clean)
        
        # 통계 출력
        stats = result['statistics']
        print(f"\n📊 실행 통계:")
        print(f"   생성: {stats['created']}개")
        print(f"   수정: {stats['updated']}개") 
        print(f"   삭제: {stats['deleted']}개")
        print(f"   건너뛰기: {stats['skipped']}개")
        print(f"   오류: {stats['errors']}개")
        
        return result
        
    except Exception as e:
        print(f"❌ 초기화 프로세스 실패: {e}")
        traceback.print_exc()
        raise
        
    finally:
        # 엔진 안전 종료
        if engine:
            try:
                engine.dispose()
                print("🔌 데이터베이스 엔진 종료")
            except Exception as dispose_error:
                print(f"⚠️ 엔진 종료 중 오류: {dispose_error}")


def main():
    """메인 실행 함수"""
    parser = argparse.ArgumentParser(
        description="접근성 미디어 제작 템플릿 초기화 스크립트",
        epilog="""
사용 예시:
  python scripts/initialize_production_templates.py                    # 안전 모드 (기본)
  python scripts/initialize_production_templates.py --mode overwrite   # 덮어쓰기 모드
  python scripts/initialize_production_templates.py --mode clean       # 완전 초기화 모드
  python scripts/initialize_production_templates.py --force-clean      # 강제 삭제 모드
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--mode', 
        choices=['safe', 'overwrite', 'clean'],
        default='safe',
        help='초기화 모드 (기본값: safe)'
    )
    
    parser.add_argument(
        '--force-clean',
        action='store_true',
        help='기존 데이터 강제 삭제'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='상세 로그 출력'
    )
    
    args = parser.parse_args()
    
    # 실행 전 확인
    if args.mode == 'clean' or args.force_clean:
        response = input("⚠️ 기존 템플릿 데이터가 삭제됩니다. 계속하시겠습니까? (y/N): ")
        if response.lower() != 'y':
            print("❌ 초기화가 취소되었습니다.")
            return
    
    try:
        result = initialize_templates(
            mode=args.mode,
            force_clean=args.force_clean
        )
        
        if args.verbose:
            print(f"\n🔍 상세 결과:")
            import json
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
        print("\n🎉 템플릿 초기화가 성공적으로 완료되었습니다!")
        
    except KeyboardInterrupt:
        print("\n⏹️ 사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n💥 예상치 못한 오류가 발생했습니다: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
