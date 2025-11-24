#!/usr/bin/env python3
import asyncio
import redis.asyncio as redis
from app.config import settings

async def test_connection():
    print("=== Redis Connection Test ===")
    print(f"REDIS_HOST: {settings.REDIS_HOST}")
    print(f"REDIS_PORT: {settings.REDIS_PORT}")
    print(f"REDIS_PASSWORD: {'*' * len(settings.REDIS_PASSWORD) if settings.REDIS_PASSWORD else 'None'}")
    print(f"REDIS_DB: {settings.REDIS_DB}")
    
    try:
        # Redis 연결 테스트
        client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5
        )
        
        # ping 테스트
        result = await client.ping()
        print(f"\n✅ Connection successful! PING result: {result}")
        
        # 간단한 set/get 테스트
        await client.set("test_key", "test_value", ex=60)
        value = await client.get("test_key")
        print(f"✅ SET/GET test successful! Value: {value}")
        
        await client.close()
        
    except Exception as e:
        print(f"\n❌ Connection failed!")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {e}")
        
        # 수동 연결 테스트 제안
        print("\n--- Manual test suggestion ---")
        print(f"Try: redis-cli -h {settings.REDIS_HOST} -p {settings.REDIS_PORT} -a {settings.REDIS_PASSWORD} ping")

if __name__ == "__main__":
    asyncio.run(test_connection())
