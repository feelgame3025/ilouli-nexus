"""JWT authentication for FastAPI."""
import logging

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import JWT_SECRET

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def _extract_token(request: Request, credentials: HTTPAuthorizationCredentials | None) -> str | None:
    """Extract JWT from Authorization header or ilouli_token cookie."""
    if credentials:
        return credentials.credentials
    return request.cookies.get("ilouli_token")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Verify JWT and return user payload. Raises 401 if invalid."""
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Return user payload if valid token present, None otherwise."""
    token = _extract_token(request, credentials)
    if not token or not JWT_SECRET:
        return None

    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def require_tier(min_tier: str):
    """Dependency factory: require minimum user tier."""
    tier_values = {"guest": 0, "general": 1, "subscriber": 2, "family": 3, "admin": 4}

    def checker(user: dict = Depends(get_current_user)) -> dict:
        user_tier = user.get("tier", "guest")
        if tier_values.get(user_tier, 0) < tier_values.get(min_tier, 0):
            raise HTTPException(status_code=403, detail=f"Requires {min_tier} tier")
        return user

    return checker
