import hashlib
import hmac
import secrets
import json
import base64
import time
from typing import Optional, Dict, Any
from backend.app.core.config import settings

# Secret key for signing tokens
SECRET_KEY = getattr(settings, "SECRET_KEY", "openoutreach_super_secret_jwt_key_2026_growth_ai")


def hash_password(password: str) -> str:
    """Hash a plaintext password using PBKDF2 with SHA-256 and a random salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${pw_hash}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against the stored salt$hash."""
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, stored_hash = hashed_password.split("$", 1)
        calc_hash = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return hmac.compare_digest(calc_hash, stored_hash)
    except Exception:
        return False


def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 86400 * 7) -> str:
    """Create a URL-safe HMAC-SHA256 signed access token."""
    data = dict(payload)
    data["exp"] = int(time.time()) + expires_in_seconds
    data["iat"] = int(time.time())
    
    body_json = json.dumps(data, separators=(',', ':')).encode('utf-8')
    b64_body = base64.urlsafe_b64encode(body_json).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        b64_body.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{b64_body}.{signature}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a signed token."""
    if not token or "." not in token:
        return None
    try:
        b64_body, signature = token.split(".", 1)
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            b64_body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_sig, signature):
            return None
        
        # Add padding back for base64 decoding
        padding = 4 - (len(b64_body) % 4)
        if padding != 4:
            b64_body += "=" * padding
            
        payload_bytes = base64.urlsafe_b64decode(b64_body.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Check expiration
        if "exp" in payload and payload["exp"] < time.time():
            return None
            
        return payload
    except Exception:
        return None
