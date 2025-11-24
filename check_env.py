#!/usr/bin/env python3
import os
from pathlib import Path

# 현재 작업 디렉토리
cwd = os.getcwd()
print(f"Current working directory: {cwd}")

# .env 파일 위치 확인
env_files = [
    Path(".env"),
    Path("app/.env"),
    Path("/home/utoweb/fastapi-app/.env"),
]

print("\n=== Checking for .env files ===")
for env_path in env_files:
    if env_path.exists():
        print(f"✅ Found: {env_path.absolute()}")
        print(f"   Size: {env_path.stat().st_size} bytes")
        
        # Redis 관련 설정 찾기
        print("   Redis settings:")
        with open(env_path, 'r') as f:
            for line in f:
                if 'REDIS' in line and not line.strip().startswith('#'):
                    # 비밀번호 마스킹
                    if 'PASSWORD' in line and '=' in line:
                        key, value = line.strip().split('=', 1)
                        print(f"     {key}={'*' * len(value)}")
                    else:
                        print(f"     {line.strip()}")
    else:
        print(f"❌ Not found: {env_path.absolute()}")

# Python dotenv 테스트
print("\n=== Testing python-dotenv ===")
try:
    from dotenv import load_dotenv, find_dotenv
    
    # .env 파일 찾기
    dotenv_path = find_dotenv()
    print(f"dotenv found: {dotenv_path}")
    
    # 환경변수 로드
    if load_dotenv(dotenv_path):
        print("✅ Successfully loaded .env file")
        
        # 로드된 Redis 설정 확인
        print("\nLoaded Redis settings:")
        for key in ['REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB']:
            value = os.getenv(key)
            if value:
                if 'PASSWORD' in key:
                    print(f"  {key}: {'*' * len(value)}")
                else:
                    print(f"  {key}: {value}")
    else:
        print("❌ Failed to load .env file")
        
except ImportError:
    print("❌ python-dotenv not installed")
    print("Run: pip install python-dotenv")
