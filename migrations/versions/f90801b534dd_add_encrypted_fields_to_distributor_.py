"""add encrypted fields to distributor contacts

Revision ID: f90801b534dd
Revises: c2127a76ee3e
Create Date: 2025-06-14 22:41:48.955754

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'f90801b534dd'
down_revision = 'c2127a76ee3e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # distributor_contacts 테이블에 암호화 필드 추가
    op.add_column('distributor_contacts', 
        sa.Column('_office_phone_encrypted', sa.String(), nullable=True)
    )
    op.add_column('distributor_contacts', 
        sa.Column('_mobile_phone_encrypted', sa.String(), nullable=True)
    )
    
    # 인덱스 추가 (선택사항 - 암호화된 필드는 일반적으로 검색하지 않으므로 필요 없을 수 있음)
    # op.create_index('idx_distributor_contacts_office_phone_encrypted', 'distributor_contacts', ['_office_phone_encrypted'])
    # op.create_index('idx_distributor_contacts_mobile_phone_encrypted', 'distributor_contacts', ['_mobile_phone_encrypted'])
    
    print("Added encrypted fields to distributor_contacts table")


def downgrade() -> None:
    # 인덱스 제거 (만약 생성했다면)
    # op.drop_index('idx_distributor_contacts_mobile_phone_encrypted', 'distributor_contacts')
    # op.drop_index('idx_distributor_contacts_office_phone_encrypted', 'distributor_contacts')
    
    # 암호화 필드 제거
    op.drop_column('distributor_contacts', '_mobile_phone_encrypted')
    op.drop_column('distributor_contacts', '_office_phone_encrypted')
    
    print("Removed encrypted fields from distributor_contacts table")
