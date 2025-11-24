#!/usr/bin/env python3
from app.config import settings
import os

print("=== Current Environment Variables ===")
print(f"REDIS_URL: {os.getenv('REDIS_URL', 'Not set')}")
print(f"REDIS_HOST: {os.getenv('REDIS_HOST', 'Not set')}")
print(f"REDIS_PORT: {os.getenv('REDIS_PORT', 'Not set')}")
print(f"REDIS_PASSWORD: {'*' * len(os.getenv('REDIS_PASSWORD', '')) if os.getenv('REDIS_PASSWORD') else 'Not set'}")
print(f"REDIS_DB: {os.getenv('REDIS_DB', 'Not set')}")

print("\n=== Settings Object Attributes ===")
for attr in dir(settings):
    if attr.startswith('REDIS'):
        try:
            value = getattr(settings, attr)
            if 'PASSWORD' in attr and value:
                print(f"{attr}: {'*' * len(str(value))}")
            else:
                print(f"{attr}: {value}")
        except AttributeError:
            print(f"{attr}: Not available")

print("\n=== What to do ===")
print("Please update your .env file:")
print("Change from:")
print("  REDIS_URL=redis://localhost:6379")
print("To:")
print("  REDIS_HOST=localhost")
print("  REDIS_PORT=6379")
