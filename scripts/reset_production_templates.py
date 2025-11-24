# scripts/reset_production_templates.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.db import engine
from app.models.production_template import ProductionTemplate
from app.services.production_template_service import ProductionTemplateService
from app.models import *  # 모든 모델 import (관계 해결)

def reset_templates():
    """기존 템플릿 삭제 후 새로운 기본 템플릿으로 초기화"""
    with Session(engine) as session:
        try:
            # 기존 템플릿 삭제
            existing_templates = session.exec(select(ProductionTemplate)).all()
            for template in existing_templates:
                session.delete(template)
            session.commit()
            print(f"✓ Deleted {len(existing_templates)} existing templates")
            
            # 템플릿 서비스로 새 템플릿 초기화
            service = ProductionTemplateService(session)
            service.initialize_default_templates()
            session.commit()
            
            # 생성된 템플릿 확인
            new_templates = session.exec(select(ProductionTemplate)).all()
            media_types = set(t.media_type for t in new_templates)
            
            print(f"✓ Created {len(new_templates)} templates")
            print(f"✓ Media types: {', '.join(sorted(media_types))}")
            print("✓ Templates initialization completed successfully!")
            
        except Exception as e:
            session.rollback()
            print(f"✗ Error: {str(e)}")
            raise

if __name__ == "__main__":
    reset_templates()
