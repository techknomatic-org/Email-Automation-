import requests
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.mailbox import Mailbox
from backend.app.models.user import User
from backend.app.schemas.user import UserRegister, UserLogin, UserResponse, AuthResponse
from backend.app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── User Sign Up / Registration ────────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse)
@router.post("/signup", response_model=AuthResponse)
@router.post("/sign-up", response_model=AuthResponse)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account and return JWT session token."""
    email_clean = (payload.email or "").strip().lower()
    if not email_clean:
        raise HTTPException(status_code=422, detail="Email address is required.")
    
    name_clean = (payload.full_name or "").strip()
    if not name_clean:
        raise HTTPException(status_code=422, detail="Full name is required.")
    
    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters long.")
    
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")
    
    user = User(
        email=email_clean,
        full_name=name_clean,
        hashed_password=hash_password(payload.password),
        role=(payload.role or "Growth Lead").strip(),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


# ── User Login / Sign In ────────────────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
@router.post("/signin", response_model=AuthResponse)
@router.post("/sign-in", response_model=AuthResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """Sign in an existing user with email and password."""
    email_clean = (payload.email or "").strip().lower()
    if not email_clean:
        raise HTTPException(status_code=422, detail="Email address is required.")
    
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email address or password.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")
    
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


# ── Current Authenticated User ──────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Retrieve the currently logged-in user profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token. Please sign in again.")
    
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    
    return user


# ── Logout ──────────────────────────────────────────────────────────────────────
@router.post("/logout")
@router.get("/logout")
@router.delete("/logout")
@router.post("/signout")
@router.get("/signout")
@router.delete("/signout")
def logout_user():
    """Logout endpoint to acknowledge session termination."""
    return {"status": "success", "message": "Successfully logged out."}



@router.get("/google/login")
def google_login():
    """Generate Google OAuth 2.0 consent URL for Gmail authentication."""
    client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
    client_secret = (settings.GOOGLE_CLIENT_SECRET or "").strip()
    redirect_uri = settings.GOOGLE_REDIRECT_URI

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google OAuth credentials are not configured. "
                "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file. "
                "See .env.example for instructions."
            )
        )

    scopes = [
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent select_account",
        "include_granted_scopes": "true",
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}


@router.get("/google/callback")
def google_callback(code: str = Query(...), db: Session = Depends(get_db)):
    """Handle Google OAuth callback — exchange code for tokens and connect Mailbox."""
    client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
    client_secret = (settings.GOOGLE_CLIENT_SECRET or "").strip()
    redirect_uri = settings.GOOGLE_REDIRECT_URI

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth credentials are not configured in .env file."
        )

    # Token Exchange
    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth token exchange failed: {token_resp.text}"
        )

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    # Fetch User Profile
    user_resp = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5,
    )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user profile")

    user_email = user_resp.json().get("email", "user@gmail.com")

    # Save / Update Mailbox
    mailbox = db.query(Mailbox).filter(Mailbox.username == user_email).first()
    if not mailbox:
        mailbox = Mailbox(
            username=user_email,
            from_address=user_email,
            password="oauth_token_secured",
            host="smtp.gmail.com",
            port=587,
            imap_host="imap.gmail.com",
            imap_port=993,
            provider="gmail",
            auth_type="oauth2",
            access_token=access_token,
            refresh_token=refresh_token,
        )
        db.add(mailbox)
    else:
        mailbox.provider = "gmail"
        mailbox.auth_type = "oauth2"
        mailbox.access_token = access_token
        if refresh_token:
            mailbox.refresh_token = refresh_token

    db.commit()

    # Redirect back to the frontend mailboxes page
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(
        url=f"{frontend_url}/mailboxes?status=connected&email={user_email}"
    )
