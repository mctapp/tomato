"""remove leading underscores

Revision ID: 8895adcd5d3a
Revises: 5de60035a5d4
Create Date: 2025-06-15 00:33:19.228944

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '8895adcd5d3a'
down_revision = '5de60035a5d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # distributor_contacts 테이블의 암호화 컬럼명 변경
    op.alter_column('distributor_contacts', '_office_phone_encrypted',
                    new_column_name='office_phone_encrypted',
                    existing_type=sa.String(),
                    existing_nullable=True)
    
    op.alter_column('distributor_contacts', '_mobile_phone_encrypted',
                    new_column_name='mobile_phone_encrypted',
                    existing_type=sa.String(),
                    existing_nullable=True)
    
    # 다른 테이블들도 동일한 패턴이 있다면 여기에 추가
    # 예: users 테이블
    # op.alter_column('users', '_phone_number_encrypted',
    #                 new_column_name='phone_number_encrypted',
    #                 existing_type=sa.String(),
    #                 existing_nullable=True)


def downgrade() -> None:
    # 롤백: 다시 언더스코어 추가
    op.alter_column('distributor_contacts', 'office_phone_encrypted',
                    new_column_name='_office_phone_encrypted',
                    existing_type=sa.String(),
                    existing_nullable=True)
    
    op.alter_column('distributor_contacts', 'mobile_phone_encrypted',
                    new_column_name='_mobile_phone_encrypted',
                    existing_type=sa.String(),
                    existing_nullable=True)
