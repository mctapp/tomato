# app/middleware/monitoring.py
from prometheus_client import Counter, Histogram, Gauge

# 메트릭 정의
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

anomaly_score_gauge = Gauge(
    'anomaly_score',
    'Current anomaly score',
    ['session_id']
)

blocked_ips = Gauge(
    'blocked_ips_total',
    'Total blocked IPs'
)
