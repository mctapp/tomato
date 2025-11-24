# app/monitoring/metrics/collectors.py
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import psutil
from sqlalchemy import text
from sqlalchemy.pool import QueuePool
from app.db import engine
from app.core.redis import redis_client
from app.monitoring.logging.structured import logger
from app.db_metrics import db_metrics  # 새로 추가
import json

class MetricsCollector:
    """시스템 메트릭 수집"""
    
    def __init__(self):
        self.metrics_history: List[Dict[str, Any]] = []
        self.collection_interval = 60  # 60초마다 수집
        self._collection_task: Optional[asyncio.Task] = None
    
    async def start_collection(self):
        """메트릭 수집 시작"""
        if self._collection_task is None:
            self._collection_task = asyncio.create_task(self._collect_loop())
            logger.info("Metrics collection started")
    
    async def stop_collection(self):
        """메트릭 수집 중지"""
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
            self._collection_task = None
            logger.info("Metrics collection stopped")
    
    async def _collect_loop(self):
        """메트릭 수집 루프"""
        while True:
            try:
                await self.collect_system_metrics()
                await asyncio.sleep(self.collection_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in metrics collection loop", error=str(e))
                await asyncio.sleep(self.collection_interval)
    
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """시스템 메트릭 수집"""
        try:
            metrics = {
                "timestamp": datetime.utcnow(),
                "cpu": self._get_cpu_metrics(),
                "memory": self._get_memory_metrics(),
                "disk": self._get_disk_metrics(),
                "network": await self._get_network_metrics(),
                "database": await self._get_database_metrics(),
                "redis": await self._get_redis_metrics(),
                "api": await self._get_api_metrics(),
                "security": await self._get_security_metrics(),
                "active_users": await self._count_active_users()
            }
            
            # 메트릭 히스토리 저장
            self.metrics_history.append(metrics)
            
            # 최대 1440개 (24시간) 유지
            if len(self.metrics_history) > 1440:
                self.metrics_history.pop(0)
            
            # Redis에 최신 메트릭 저장
            await self._save_to_redis(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error("Failed to collect system metrics", error=str(e))
            return {}
    
    def _get_cpu_metrics(self) -> Dict[str, float]:
        """CPU 메트릭"""
        return {
            "usage_percent": psutil.cpu_percent(interval=1),
            "core_count": psutil.cpu_count(),
            "load_average": psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0
        }
    
    def _get_memory_metrics(self) -> Dict[str, Any]:
        """메모리 메트릭"""
        memory = psutil.virtual_memory()
        return {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent
        }
    
    def _get_disk_metrics(self) -> Dict[str, Any]:
        """디스크 메트릭"""
        disk = psutil.disk_usage('/')
        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        }
    
    async def _get_network_metrics(self) -> Dict[str, Any]:
        """네트워크 메트릭"""
        net_io = psutil.net_io_counters()
        return {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        }
    
    async def _get_database_metrics(self) -> Dict[str, Any]:
        """데이터베이스 메트릭"""
        try:
            return await db_metrics.get_metrics()
        except Exception as e:
            logger.error("Failed to get database metrics", error=str(e))
            return {}
    
    async def _get_redis_metrics(self) -> Dict[str, Any]:
        """Redis 메트릭"""
        try:
            await redis_client.ensure_connected()
            info = await redis_client.redis.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "total_commands_processed": info.get("total_commands_processed", 0)
            }
        except Exception as e:
            logger.error("Failed to get Redis metrics", error=str(e))
            return {}
    
    async def _get_api_metrics(self) -> Dict[str, Any]:
        """API 메트릭"""
        try:
            # 최근 5분간 요청 수
            now = datetime.utcnow()
            five_minutes_ago = now - timedelta(minutes=5)
            
            request_count = await redis_client.redis.zcount(
                "api_requests",
                five_minutes_ago.timestamp(),
                now.timestamp()
            )
            
            # 에러율
            error_count = await redis_client.redis.zcount(
                "api_errors",
                five_minutes_ago.timestamp(),
                now.timestamp()
            )
            
            error_rate = (error_count / request_count * 100) if request_count > 0 else 0
            
            return {
                "requests_per_5min": request_count,
                "errors_per_5min": error_count,
                "error_rate": error_rate
            }
        except Exception as e:
            logger.error("Failed to get API metrics", error=str(e))
            return {}
    
    async def _get_security_metrics(self) -> Dict[str, Any]:
        """보안 메트릭"""
        try:
            # 차단된 IP 수
            blocked_ips = await redis_client.redis.scard("ip:blacklist")
            
            # 최근 로그인 실패 수
            now = datetime.utcnow()
            one_hour_ago = now - timedelta(hours=1)
            
            failed_logins = await redis_client.redis.zcount(
                "failed_logins",
                one_hour_ago.timestamp(),
                now.timestamp()
            )
            
            return {
                "blocked_ips": blocked_ips,
                "failed_logins_last_hour": failed_logins
            }
        except Exception as e:
            logger.error("Failed to get security metrics", error=str(e))
            return {}
    
    async def _count_active_users(self) -> int:
        """활성 사용자 수"""
        try:
            # 활성 세션 수 카운트
            pattern = "session:*"
            sessions = await redis_client.redis.keys(pattern)
            return len(sessions)
        except Exception as e:
            logger.error("Failed to count active users", error=str(e))
            return 0
    
    async def _save_to_redis(self, metrics: Dict[str, Any]):
        """Redis에 메트릭 저장"""
        try:
            # JSON 직렬화 가능한 형태로 변환
            serializable_metrics = self._make_serializable(metrics)
            
            await redis_client.redis.setex(
                "system:metrics:latest",
                300,  # 5분 TTL
                json.dumps(serializable_metrics)
            )
            
            # 시계열 데이터 저장
            await redis_client.redis.zadd(
                "system:metrics:history",
                {json.dumps(serializable_metrics): metrics["timestamp"].timestamp()}
            )
            
            # 오래된 데이터 정리 (24시간 이상)
            cutoff = (datetime.utcnow() - timedelta(days=1)).timestamp()
            await redis_client.redis.zremrangebyscore(
                "system:metrics:history",
                0,
                cutoff
            )
        except Exception as e:
            logger.error("Failed to save metrics to Redis", error=str(e))
    
    def _make_serializable(self, obj: Any) -> Any:
        """객체를 JSON 직렬화 가능한 형태로 변환"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        else:
            return obj
    
    async def get_latest_metrics(self) -> Optional[Dict[str, Any]]:
        """최신 메트릭 조회"""
        try:
            data = await redis_client.redis.get("system:metrics:latest")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error("Failed to get latest metrics", error=str(e))
            return None
    
    def record_http_request(
        self,
        method: str,
        endpoint: str,
        status: int,
        duration: float,
        request_size: int
    ):
        """HTTP 요청 메트릭 기록"""
        try:
            # 메트릭 데이터 구성
            metric_data = {
                "method": method,
                "endpoint": endpoint,
                "status": status,
                "duration": duration,
                "request_size": request_size,
                "timestamp": datetime.utcnow()
            }
            
            # 로깅으로 일단 처리
            logger.info(
                "http_request_metric",
                **metric_data
            )
            
            # Redis에 비동기로 저장하기 위해 태스크 생성
            asyncio.create_task(self._save_http_metric_to_redis(metric_data))
            
        except Exception as e:
            logger.error("Failed to record HTTP request metric", error=str(e))
    
    async def _save_http_metric_to_redis(self, metric_data: Dict[str, Any]):
        """HTTP 메트릭을 Redis에 저장"""
        try:
            # API 요청을 시계열 데이터로 저장
            await redis_client.redis.zadd(
                "api_requests",
                {json.dumps(self._make_serializable(metric_data)): metric_data["timestamp"].timestamp()}
            )
            
            # 에러인 경우 별도로 저장
            if metric_data["status"] >= 400:
                await redis_client.redis.zadd(
                    "api_errors",
                    {json.dumps(self._make_serializable(metric_data)): metric_data["timestamp"].timestamp()}
                )
            
            # 엔드포인트별 통계 업데이트
            endpoint_key = f"endpoint_stats:{metric_data['endpoint']}:{metric_data['method']}"
            await redis_client.redis.hincrby(endpoint_key, "total_requests", 1)
            await redis_client.redis.hincrby(endpoint_key, f"status_{metric_data['status']}", 1)
            await redis_client.redis.hincrbyfloat(endpoint_key, "total_duration", metric_data["duration"])
            
            # TTL 설정 (7일)
            await redis_client.redis.expire(endpoint_key, 604800)
            
        except Exception as e:
            logger.error("Failed to save HTTP metric to Redis", error=str(e))


# 전역 메트릭 수집기
metrics_collector = MetricsCollector()
