# scripts/init_templates.py
from sqlalchemy import create_engine, text
import os
import sys
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings

engine = create_engine(str(settings.DATABASE_URL))

with engine.connect() as conn:
    trans = conn.begin()
    try:
        conn.execute(text('DELETE FROM production_templates'))
        
        checklist = json.dumps([
            {"id": 1, "item": "영상 원본 파일 확보", "required": True, "checked": False},
            {"id": 2, "item": "시나리오/대본 확보", "required": True, "checked": False},
            {"id": 3, "item": "필요 인력 섭외 완료", "required": True, "checked": False},
            {"id": 4, "item": "제작 가이드라인 검토", "required": True, "checked": False}
        ])
        
        for media_type in ['AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR']:
            # 모든 단계 한번에 삽입
            conn.execute(text('''
                INSERT INTO production_templates 
                (media_type, stage_number, task_name, task_order, speed_a_hours, speed_b_hours, speed_c_hours, 
                 is_required, requires_review, requires_monitoring, review_hours_a, review_hours_b, review_hours_c,
                 monitoring_hours_a, monitoring_hours_b, monitoring_hours_c, is_parallel,
                 quality_checklist, acceptance_criteria, is_active)
                VALUES 
                -- 1단계
                (:mt, 1, '자료 준비 및 섭외 체크', 1, 1.5, 2.0, 3.0, true, false, false, 0, 0, 0, 0, 0, 0, false,
                 :checklist, '모든 필수 자료 확보 및 인력 섭외 완료', true),
                -- 2단계
                (:mt, 2, '초안 작성', 1, 6.0, 8.0, 10.0, true, false, false, 0, 0, 0, 0, 0, 0, false, null, '초안 작성 완료', true),
                (:mt, 2, '1차 검수', 2, 1.5, 2.0, 3.0, false, true, false, 1.5, 2.0, 3.0, 0, 0, 0, false, null, '검수 완료 및 수정사항 도출', true),
                (:mt, 2, '수정 작업', 3, 3.0, 4.0, 5.0, true, false, false, 0, 0, 0, 0, 0, 0, false, null, '수정사항 반영 완료', true),
                (:mt, 2, '최종 모니터링', 4, 1.5, 2.0, 2.5, false, false, true, 0, 0, 0, 1.5, 2.0, 2.5, false, null, '최종 품질 확인 완료', true),
                -- 3단계
                (:mt, 3, '메인 제작 작업', 1, 6.0, 8.0, 10.0, true, false, false, 0, 0, 0, 0, 0, 0, false, null, '제작 완료', true),
                (:mt, 3, '편집 및 후반작업', 2, 3.0, 4.0, 5.0, true, false, false, 0, 0, 0, 0, 0, 0, false, null, '편집 및 동기화 완료', true),
                (:mt, 3, '품질 검수', 3, 1.5, 2.0, 3.0, false, true, false, 1.5, 2.0, 3.0, 0, 0, 0, false, null, '품질 기준 통과', true),
                -- 4단계
                (:mt, 4, '최종 파일 생성', 1, 0.5, 1.0, 1.5, true, false, false, 0, 0, 0, 0, 0, 0, false, null, '배포용 파일 생성 완료', true),
                (:mt, 4, '배포 준비', 2, 0.5, 1.0, 1.5, true, false, false, 0, 0, 0, 0, 0, 0, false, null, '배포 준비 완료', true)
            '''), {'mt': media_type, 'checklist': checklist})
            
        trans.commit()
        print('Templates initialized successfully')
    except Exception as e:
        trans.rollback()
        print(f'Error: {e}')
        raise
