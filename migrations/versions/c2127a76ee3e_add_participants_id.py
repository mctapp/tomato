"""add participants id

Revision ID: c2127a76ee3e
Revises: ac1eb0107b20
Create Date: 2025-06-08 10:55:56.570337

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import json

# revision identifiers, used by Alembic.
revision = 'c2127a76ee3e'
down_revision = 'ac1eb0107b20'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 임시 컬럼 추가 (기존 데이터 백업용)
    op.add_column('production_archives', 
        sa.Column('participants_backup', sa.JSON(), nullable=True)
    )
    
    # 2. 기존 participants 데이터를 백업 컬럼으로 복사
    connection = op.get_bind()
    result = connection.execute(
        text("UPDATE production_archives SET participants_backup = participants")
    )
    
    # 3. 기존 데이터 마이그레이션 (이름으로 매칭하여 ID 복원)
    archives = connection.execute(
        text("SELECT id, participants, access_asset_id FROM production_archives")
    ).fetchall()
    
    for archive in archives:
        archive_id, participants_json, access_asset_id = archive
        if not participants_json:
            continue
            
        participants = json.loads(participants_json) if isinstance(participants_json, str) else participants_json
        
        # access_asset_credits에서 해당 access_asset의 크레디트 정보 조회
        credits = connection.execute(
            text("""
                SELECT c.id as credit_id, c.person_type, c.role, c.is_primary,
                       c.scriptwriter_id, c.voice_artist_id, c.sl_interpreter_id, c.staff_id,
                       s.name as scriptwriter_name,
                       v.voiceartist_name as voice_artist_name,
                       sl.name as sl_interpreter_name,
                       st.name as staff_name
                FROM access_asset_credits c
                LEFT JOIN scriptwriters s ON c.scriptwriter_id = s.id
                LEFT JOIN voice_artists v ON c.voice_artist_id = v.id
                LEFT JOIN sl_interpreters sl ON c.sl_interpreter_id = sl.id
                LEFT JOIN staffs st ON c.staff_id = st.id
                WHERE c.access_asset_id = :asset_id
            """),
            {"asset_id": access_asset_id}
        ).fetchall()
        
        # 크레디트 정보를 이름-역할로 매핑
        credit_map = {}
        for credit in credits:
            # 실제 person 이름 찾기
            if credit.person_type == 'scriptwriter' and credit.scriptwriter_name:
                name = credit.scriptwriter_name
                person_id = credit.scriptwriter_id
            elif credit.person_type == 'voice_artist' and credit.voice_artist_name:
                name = credit.voice_artist_name
                person_id = credit.voice_artist_id
            elif credit.person_type == 'sl_interpreter' and credit.sl_interpreter_name:
                name = credit.sl_interpreter_name
                person_id = credit.sl_interpreter_id
            elif credit.person_type == 'staff' and credit.staff_name:
                name = credit.staff_name
                person_id = credit.staff_id
            else:
                continue
                
            key = f"{name}:{credit.role}"
            credit_map[key] = {
                'credit_id': credit.credit_id,
                'person_id': person_id,
                'person_type': credit.person_type
            }
        
        # 새로운 participants 구조 생성
        new_participants = {"participants": []}
        
        # main_writer 처리
        if 'main_writer' in participants and participants['main_writer']:
            writer = participants['main_writer']
            key = f"{writer['name']}:{writer['role']}"
            if key in credit_map:
                new_participants['participants'].append({
                    'credit_id': credit_map[key]['credit_id'],
                    'person_id': credit_map[key]['person_id'],
                    'person_type': credit_map[key]['person_type'],
                    'name': writer['name'],
                    'role': writer['role'],
                    'is_primary': writer.get('is_primary', True)
                })
        
        # producer 처리
        if 'producer' in participants and participants['producer']:
            producer = participants['producer']
            key = f"{producer['name']}:{producer['role']}"
            if key in credit_map:
                new_participants['participants'].append({
                    'credit_id': credit_map[key]['credit_id'],
                    'person_id': credit_map[key]['person_id'],
                    'person_type': credit_map[key]['person_type'],
                    'name': producer['name'],
                    'role': producer['role'],
                    'is_primary': producer.get('is_primary', True)
                })
        
        # 리스트 형태의 참여자들 처리
        for role_group in ['reviewers', 'monitors', 'voice_artists', 'sl_interpreters', 'other_staff']:
            if role_group in participants and participants[role_group]:
                for person in participants[role_group]:
                    key = f"{person['name']}:{person['role']}"
                    if key in credit_map:
                        new_participants['participants'].append({
                            'credit_id': credit_map[key]['credit_id'],
                            'person_id': credit_map[key]['person_id'],
                            'person_type': credit_map[key]['person_type'],
                            'name': person['name'],
                            'role': person['role'],
                            'is_primary': person.get('is_primary', False)
                        })
        
        # 업데이트
        connection.execute(
            text("UPDATE production_archives SET participants = :participants WHERE id = :id"),
            {"participants": json.dumps(new_participants), "id": archive_id}
        )
    
    # 4. 백업 컬럼은 유지 (안전을 위해)
    # op.drop_column('production_archives', 'participants_backup')


def downgrade() -> None:
    # 백업에서 복원
    connection = op.get_bind()
    connection.execute(
        text("UPDATE production_archives SET participants = participants_backup WHERE participants_backup IS NOT NULL")
    )
    
    # 백업 컬럼 제거
    op.drop_column('production_archives', 'participants_backup')
