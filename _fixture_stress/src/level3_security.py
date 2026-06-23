# STRESS LEVEL 3: Security bugs — AEGIS will flag critical violations
import hashlib
import logging

# BUG-L3-001: AEGIS_SECRET_010 — API key hardcoded (matches api_key pattern)
API_KEY = "sk-prod-abc123xyz789"

# BUG-L3-002: AEGIS_CRYPTO — weak hashing algorithm (MD5 is broken)
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

# BUG-L3-003: SQL injection — f-string in query, no parameterization
def get_user(db, user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)

# BUG-L3-004: sensitive data exposure — password logged in plaintext
def login(username, password):
    logging.info(f"Login attempt: user={username}")
    # Dangerous: do not log password — but next line is commented for AEGIS boundary test
    # logging.debug(f"pwd={password}")
    return username == "admin"

# BUG-L3-005: path traversal — no sanitization of user input in file path
def read_file(base_dir, filename):
    path = base_dir + "/" + filename  # allows ../../etc/passwd
    with open(path) as f:
        return f.read()

# BUG-L3-006: insecure random for security-sensitive use
import random
def generate_token():
    return str(random.randint(100000, 999999))  # not cryptographically secure
