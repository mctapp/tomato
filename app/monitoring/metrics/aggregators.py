# app/monitoring/metrics/aggregators.py
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from app.core.redis import redis_client
import statistics
import json

class MetricsAggregator:
    """메트릭 집계 및 분석"""
    
    def __init__(self):
        self.aggregation_intervals = {
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "1h": 3600,
            "6h": 21600,
            "24h": 86400
        }
    
    async def aggregate_time_series(
        self,
        metric_name: str,
        interval: str = "5m",
        lookback_periods: int = 12
    ) -> List[Dict[str, Any]]:
        """시계열 데이터 집계"""
        interval_seconds = self.aggregation_intervals.get(interval, 300)
        now = datetime.utcnow()
        
        time_series = []
        
        for i in range(lookback_periods):
            period_start = now - timedelta(seconds=interval_seconds * (i + 1))
            period_end = now - timedelta(seconds=interval_seconds * i)
            
            # Redis에서 해당 기간 데이터 조회
            data_points = await self._get_metric_data(
                metric_name,
                period_start,
                period_end
            )
            
            if data_points:
                aggregated = {
                    "timestamp": period_end.isoformat(),
                    "interval": interval,
                    "count": len(data_points),
                    "sum": sum(data_points),
                    "avg": statistics.mean(data_points),
                    "min": min(data_points),
                    "max": max(data_points),
                    "median": statistics.median(data_points),
                    "p95": self._percentile(data_points, 95),
                    "p99": self._percentile(data_points, 99)
                }
            else:
                aggregated = {
                    "timestamp": period_end.isoformat(),
                    "interval": interval,
                    "count": 0,
                    "sum": 0,
                    "avg": 0,
                    "min": 0,
                    "max": 0,
                    "median": 0,
                    "p95": 0,
                    "p99": 0
                }
            
            time_series.append(aggregated)
        
        return time_series
    
    async def calculate_rates(
        self,
        metric_name: str,
        window: str = "5m"
    ) -> Dict[str, float]:
        """비율 계산 (예: 요청/초)"""
        window_seconds = self.aggregation_intervals.get(window, 300)
        
        # 카운터 값 조회
        current_value = await self._get_counter_value(metric_name)
        previous_value = await self._get_counter_value(
            metric_name,
            datetime.utcnow() - timedelta(seconds=window_seconds)
        )
        
        if current_value and previous_value:
            rate = (current_value - previous_value) / window_seconds
        else:
            rate = 0
        
        return {
            "rate_per_second": rate,
            "rate_per_minute": rate * 60,
            "window": window,
            "current_total": current_value or 0
        }
    
    async def detect_anomalies(
        self,
        metric_name: str,
        threshold_stddev: float = 3.0
    ) -> List[Dict[str, Any]]:
        """통계적 이상 탐지"""
        # 최근 1시간 데이터로 기준선 설정
        baseline_data = await self._get_metric_data(
            metric_name,
            datetime.utcnow() - timedelta(hours=1),
            datetime.utcnow()
        )
        
        if len(baseline_data) < 10:
            return []
        
        mean = statistics.mean(baseline_data)
        stddev = statistics.stdev(baseline_data)
        
        # 최근 5분 데이터 확인
        recent_data = await self._get_metric_data(
            metric_name,
            datetime.utcnow() - timedelta(minutes=5),
            datetime.utcnow()
        )
        
        anomalies = []
        for value in recent_data:
            z_score = (value - mean) / stddev if stddev > 0 else 0
            
            if abs(z_score) > threshold_stddev:
                anomalies.append({
                    "metric": metric_name,
                    "value": value,
                    "z_score": z_score,
                    "mean": mean,
                    "stddev": stddev,
                    "timestamp": datetime.utcnow().isoformat(),
                    "severity": "HIGH" if abs(z_score) > 4 else "MEDIUM"
                })
        
        return anomalies
    
    async def generate_summary_report(
        self,
        metrics: List[str],
        period: str = "24h"
    ) -> Dict[str, Any]:
        """종합 요약 보고서 생성"""
        period_seconds = self.aggregation_intervals.get(period, 86400)
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(seconds=period_seconds)
        
        report = {
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "metrics": {}
        }
        
        for metric in metrics:
            # 시계열 데이터
            time_series = await self.aggregate_time_series(metric, "1h", 24)
            
            # 전체 통계
            all_data = []
            for point in time_series:
                all_data.extend([point["avg"]] * point["count"])
            
            if all_data:
                report["metrics"][metric] = {
                    "total": sum(all_data),
                    "average": statistics.mean(all_data),
                    "median": statistics.median(all_data),
                    "std_dev": statistics.stdev(all_data) if len(all_data) > 1 else 0,
                    "min": min(all_data),
                    "max": max(all_data),
                    "time_series": time_series,
                    "anomalies": await self.detect_anomalies(metric)
                }
            else:
                report["metrics"][metric] = {
                    "total": 0,
                    "average": 0,
                    "median": 0,
                    "std_dev": 0,
                    "min": 0,
                    "max": 0,
                    "time_series": [],
                    "anomalies": []
                }
        
        # 상관관계 분석
        if len(metrics) > 1:
            report["correlations"] = await self._calculate_correlations(metrics)
        
        return report
    
    async def _get_metric_data(
        self,
        metric_name: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[float]:
        """메트릭 데이터 조회"""
        # Redis Time Series 또는 다른 시계열 DB에서 조회
        # 여기서는 간단한 예시
        key = f"metric:{metric_name}:data"
        data = await redis_client.get_json(key) or []
        
        # 시간 범위 필터링
        filtered = []
        for point in data:
            timestamp = datetime.fromisoformat(point["timestamp"])
            if start_time <= timestamp <= end_time:
                filtered.append(point["value"])
        
        return filtered
    
    async def _get_counter_value(
        self,
        metric_name: str,
        timestamp: Optional[datetime] = None
    ) -> Optional[float]:
        """카운터 값 조회"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        key = f"counter:{metric_name}:{timestamp.strftime('%Y%m%d%H')}"
        value = await redis_client.redis.get(key)
        return float(value) if value else None
    
    def _percentile(self, data: List[float], percentile: float) -> float:
        """백분위수 계산"""
        if not data:
            return 0
        
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    async def _calculate_correlations(
        self,
        metrics: List[str]
    ) -> Dict[str, float]:
        """메트릭 간 상관관계 계산"""
        correlations = {}
        
        # 간단한 피어슨 상관계수 계산
        for i in range(len(metrics)):
            for j in range(i + 1, len(metrics)):
                metric1 = metrics[i]
                metric2 = metrics[j]
                
                data1 = await self._get_metric_data(
                    metric1,
                    datetime.utcnow() - timedelta(hours=24),
                    datetime.utcnow()
                )
                data2 = await self._get_metric_data(
                    metric2,
                    datetime.utcnow() - timedelta(hours=24),
                    datetime.utcnow()
                )
                
                if len(data1) == len(data2) and len(data1) > 1:
                    correlation = self._pearson_correlation(data1, data2)
                    correlations[f"{metric1}_vs_{metric2}"] = correlation
        
        return correlations
    
    def _pearson_correlation(self, x: List[float], y: List[float]) -> float:
        """피어슨 상관계수 계산"""
        n = len(x)
        if n == 0:
            return 0
        
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(x[i] ** 2 for i in range(n))
        sum_y2 = sum(y[i] ** 2 for i in range(n))
        
        numerator = n * sum_xy - sum_x * sum_y
        denominator = ((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2)) ** 0.5
        
        if denominator == 0:
            return 0
        
        return numerator / denominator

# 전역 메트릭 집계기
metrics_aggregator = MetricsAggregator()
