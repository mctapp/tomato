# app/db_metrics.py
import asyncpg
import os
from typing import Dict, Any

class DatabaseMetrics:
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        # SQLAlchemy URL을 asyncpg 형식으로 변환
        # postgresql+psycopg2://user:pass@host/db -> postgresql://user:pass@host/db
        self.asyncpg_url = self.database_url.replace("postgresql+psycopg2://", "postgresql://")
        # 혹시 다른 드라이버 형식도 처리
        self.asyncpg_url = self.asyncpg_url.replace("postgresql+asyncpg://", "postgresql://")
        
    async def get_metrics(self) -> Dict[str, Any]:
        """데이터베이스 메트릭 조회"""
        conn = None
        try:
            # asyncpg로 직접 연결
            conn = await asyncpg.connect(self.asyncpg_url)
            
            # 활성 연결 수
            active_connections = await conn.fetchval(
                "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'"
            )
            
            # 데이터베이스 크기
            db_size = await conn.fetchval(
                "SELECT pg_database_size(current_database())"
            )
            
            return {
                "active_connections": active_connections or 0,
                "database_size": db_size or 0,
                "pool_status": {
                    "size": 0,  # asyncpg는 풀 정보 제공 안함
                    "checked_in": 0,
                    "overflow": 0,
                    "total": 0
                }
            }
        except Exception as e:
            print(f"Database metrics error: {e}")
            return {
                "active_connections": 0,
                "database_size": 0,
                "pool_status": {
                    "size": 0,
                    "checked_in": 0,
                    "overflow": 0,
                    "total": 0
                }
            }
        finally:
            if conn:
                await conn.close()

# 전역 인스턴스
db_metrics = DatabaseMetrics()
