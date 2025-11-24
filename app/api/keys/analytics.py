# app/api/keys/analytics.py
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select, func
from app.models.api_keys import APIKey, APIKeyUsageLog
from app.core.redis import redis_client
import json

class APIKeyAnalytics:
    """API 키 사용 분석"""
    
    async def record_usage(
        self,
        db: Session,
        api_key: APIKey,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int,
        ip_address: str,
        user_agent: Optional[str] = None,
        origin: Optional[str] = None,
        request_id: str = None,
        error_message: Optional[str] = None
    ):
        """API 키 사용 기록"""
        # 데이터베이스 로그
        usage_log = APIKeyUsageLog(
            api_key_id=api_key.id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            ip_address=ip_address,
            user_agent=user_agent,
            origin=origin,
            request_id=request_id,
            error_message=error_message,
            timestamp=datetime.utcnow()
        )
        
        db.add(usage_log)
        
        # API 키 통계 업데이트
        api_key.request_count += 1
        api_key.last_used_at = datetime.utcnow()
        api_key.last_used_ip = ip_address
        
        db.add(api_key)
        db.commit()
        
        # 실시간 통계 (Redis)
        await self._update_realtime_stats(api_key, endpoint, method, status_code)
    
    async def _update_realtime_stats(
        self,
        api_key: APIKey,
        endpoint: str,
        method: str,
        status_code: int
    ):
        """실시간 통계 업데이트"""
        now = datetime.utcnow()
        
        # 시간별 통계
        hour_key = f"api_stats:{api_key.id}:{now.strftime('%Y%m%d%H')}"
        
        # 요청 수
        await redis_client.redis.hincrby(hour_key, "total_requests", 1)
        await redis_client.redis.hincrby(hour_key, f"method:{method}", 1)
        await redis_client.redis.hincrby(hour_key, f"endpoint:{endpoint}", 1)
        
        # 상태 코드별
        if status_code >= 200 and status_code < 300:
            await redis_client.redis.hincrby(hour_key, "success", 1)
        elif status_code >= 400 and status_code < 500:
            await redis_client.redis.hincrby(hour_key, "client_errors", 1)
        elif status_code >= 500:
            await redis_client.redis.hincrby(hour_key, "server_errors", 1)
        
        # TTL 설정 (24시간)
        await redis_client.redis.expire(hour_key, 86400)
        
        # 일별 집계
        day_key = f"api_stats:daily:{api_key.id}:{now.strftime('%Y%m%d')}"
        await redis_client.redis.hincrby(day_key, "total_requests", 1)
        await redis_client.redis.expire(day_key, 86400 * 30)  # 30일
    
    async def get_usage_stats(
        self,
        db: Session,
        api_key: APIKey,
        period: str = "24h"
    ) -> Dict:
        """사용 통계 조회"""
        # 기간 계산
        if period == "1h":
            start_time = datetime.utcnow() - timedelta(hours=1)
        elif period == "24h":
            start_time = datetime.utcnow() - timedelta(days=1)
        elif period == "7d":
            start_time = datetime.utcnow() - timedelta(days=7)
        elif period == "30d":
            start_time = datetime.utcnow() - timedelta(days=30)
        else:
            start_time = datetime.utcnow() - timedelta(days=1)
        
        # DB에서 상세 로그 조회
        query = select(
            APIKeyUsageLog.endpoint,
            APIKeyUsageLog.method,
            APIKeyUsageLog.status_code,
            func.count(APIKeyUsageLog.id).label("count"),
            func.avg(APIKeyUsageLog.response_time_ms).label("avg_response_time"),
            func.max(APIKeyUsageLog.response_time_ms).label("max_response_time"),
            func.min(APIKeyUsageLog.response_time_ms).label("min_response_time")
        ).where(
            APIKeyUsageLog.api_key_id == api_key.id,
            APIKeyUsageLog.timestamp >= start_time
        ).group_by(
            APIKeyUsageLog.endpoint,
            APIKeyUsageLog.method,
            APIKeyUsageLog.status_code
        )
        
        results = db.exec(query).all()
        
        # 통계 집계
        stats = {
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "total_requests": 0,
            "success_rate": 0,
            "avg_response_time": 0,
            "endpoints": {},
            "methods": {},
            "status_codes": {},
            "errors": []
        }
        
        total_response_time = 0
        success_count = 0
        
        for row in results:
            endpoint, method, status_code, count, avg_rt, max_rt, min_rt = row
            
            stats["total_requests"] += count
            total_response_time += avg_rt * count
            
            if 200 <= status_code < 300:
                success_count += count
            
            # 엔드포인트별
            if endpoint not in stats["endpoints"]:
                stats["endpoints"][endpoint] = {
                    "count": 0,
                    "methods": {},
                    "avg_response_time": 0
                }
            stats["endpoints"][endpoint]["count"] += count
            stats["endpoints"][endpoint]["methods"][method] = count
            
            # 메소드별
            if method not in stats["methods"]:
                stats["methods"][method] = 0
            stats["methods"][method] += count
            
            # 상태 코드별
            status_group = f"{status_code // 100}xx"
            if status_group not in stats["status_codes"]:
                stats["status_codes"][status_group] = 0
            stats["status_codes"][status_group] += count
        
        # 전체 통계 계산
        if stats["total_requests"] > 0:
            stats["success_rate"] = (success_count / stats["total_requests"]) * 100
            stats["avg_response_time"] = total_response_time / stats["total_requests"]
        
        # 최근 에러 조회
        error_query = select(APIKeyUsageLog).where(
            APIKeyUsageLog.api_key_id == api_key.id,
            APIKeyUsageLog.timestamp >= start_time,
            APIKeyUsageLog.status_code >= 400
        ).order_by(APIKeyUsageLog.timestamp.desc()).limit(10)
        
        errors = db.exec(error_query).all()
        stats["errors"] = [
            {
                "timestamp": error.timestamp.isoformat(),
                "endpoint": error.endpoint,
                "method": error.method,
                "status_code": error.status_code,
                "error_message": error.error_message,
                "ip_address": error.ip_address
            }
            for error in errors
        ]
        
        # 시간대별 분포 (Redis에서)
        stats["hourly_distribution"] = await self._get_hourly_distribution(api_key, period)
        
        return stats
    
    async def _get_hourly_distribution(self, api_key: APIKey, period: str) -> List[Dict]:
        """시간대별 분포"""
        distribution = []
        now = datetime.utcnow()
        
        # 시간 수 계산
        hours = 24 if period in ["24h", "1d"] else 168 if period == "7d" else 720
        
        for i in range(min(hours, 24)):  # 최대 24시간
            hour_time = now - timedelta(hours=i)
            hour_key = f"api_stats:{api_key.id}:{hour_time.strftime('%Y%m%d%H')}"
            
            data = await redis_client.redis.hgetall(hour_key)
            if data:
                distribution.append({
                    "hour": hour_time.strftime("%Y-%m-%d %H:00"),
                    "requests": int(data.get("total_requests", 0)),
                    "success": int(data.get("success", 0)),
                    "errors": int(data.get("client_errors", 0)) + int(data.get("server_errors", 0))
                })
        
        return list(reversed(distribution))  # 시간순 정렬
    
    async def get_top_consumers(self, db: Session, days: int = 7) -> List[Dict]:
        """상위 API 키 사용자"""
        start_time = datetime.utcnow() - timedelta(days=days)
        
        query = select(
            APIKey.id,
            APIKey.name,
            APIKey.key_prefix,
            func.count(APIKeyUsageLog.id).label("request_count"),
            func.avg(APIKeyUsageLog.response_time_ms).label("avg_response_time")
        ).join(
            APIKeyUsageLog, APIKey.id == APIKeyUsageLog.api_key_id
        ).where(
            APIKeyUsageLog.timestamp >= start_time
        ).group_by(
            APIKey.id, APIKey.name, APIKey.key_prefix
        ).order_by(
            func.count(APIKeyUsageLog.id).desc()
        ).limit(10)
        
        results = db.exec(query).all()
        
        return [
            {
                "api_key_id": row[0],
                "name": row[1],
                "key_prefix": row[2],
                "request_count": row[3],
                "avg_response_time": row[4]
            }
            for row in results
        ]

# 전역 분석기
api_key_analytics = APIKeyAnalytics()
