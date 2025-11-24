# simple_update.py
import bcrypt

# 새로운 비밀번호 해시 생성
password = "mctuto055@!"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password.encode(), salt)
print(hashed.decode())
