import os
import requests
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from backend.app.core.database import get_db
from backend.app.models.mailbox import Mailbox
from backend.app.schemas.mailbox import MailboxCreate, MailboxResponse
from backend.app.services.email_service import email_service

router = APIRouter(prefix="/mailboxes", tags=["Mailboxes"])

def get_google_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/mailboxes/gmail/oauth/callback").strip()
    return client_id, client_secret, redirect_uri


class TestSendRequest(BaseModel):
    mailbox_id: int
    to_email: str
    subject: str
    body: str


@router.get("", response_model=List[MailboxResponse])
def list_mailboxes(db: Session = Depends(get_db)):
    return db.query(Mailbox).all()


@router.post("", response_model=MailboxResponse, status_code=status.HTTP_201_CREATED)
def create_mailbox(payload: MailboxCreate, db: Session = Depends(get_db)):
    existing = db.query(Mailbox).filter(Mailbox.username == payload.username).first()
    if existing:
        for key, value in payload.model_dump().items():
            setattr(existing, key, value)
        existing.auth_type = "smtp"
        db.commit()
        db.refresh(existing)
        return existing
    
    mailbox_data = payload.model_dump()
    mailbox_data["auth_type"] = "smtp"
    mailbox = Mailbox(**mailbox_data)
    db.add(mailbox)
    db.commit()
    db.refresh(mailbox)
    return mailbox


class OAuthConfigRequest(BaseModel):
    client_id: str
    client_secret: str

@router.post("/gmail/oauth/config")
def set_google_oauth_config(payload: OAuthConfigRequest):
    client_id = payload.client_id.strip()
    client_secret = payload.client_secret.strip()
    os.environ["GOOGLE_CLIENT_ID"] = client_id
    os.environ["GOOGLE_CLIENT_SECRET"] = client_secret
    
    env_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        new_lines = []
        cid_set = False
        cs_set = False
        for line in lines:
            if line.startswith("GOOGLE_CLIENT_ID="):
                new_lines.append(f"GOOGLE_CLIENT_ID={client_id}\n")
                cid_set = True
            elif line.startswith("GOOGLE_CLIENT_SECRET="):
                new_lines.append(f"GOOGLE_CLIENT_SECRET={client_secret}\n")
                cs_set = True
            else:
                new_lines.append(line)
        if not cid_set:
            new_lines.append(f"GOOGLE_CLIENT_ID={client_id}\n")
        if not cs_set:
            new_lines.append(f"GOOGLE_CLIENT_SECRET={client_secret}\n")
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

    return {"status": "success", "message": "Google OAuth credentials saved successfully!"}

@router.get("/gmail/oauth/login")
def gmail_oauth_login():
    """Generates Google OAuth authorization URL for Gmail account connection."""
    client_id, client_secret, redirect_uri = get_google_config()
    
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth credentials are not configured in backend .env file. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )

    scopes = [
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
    ]

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent select_account",
        "include_granted_scopes": "true"
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url, "client_id": client_id, "redirect_uri": redirect_uri}


@router.get("/gmail/oauth/callback")
def gmail_oauth_callback(code: str = Query(...), db: Session = Depends(get_db)):
    """Handles Google OAuth callback, exchanges authorization code, and persists connected Mailbox."""
    client_id, client_secret, redirect_uri = get_google_config()
    
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth credentials are not configured in backend .env file."
        )

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }

    resp = requests.post(token_url, data=data, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"OAuth token exchange failed: {resp.text}")

    tokens = resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    user_info_resp = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5
    )
    if user_info_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user profile")

    user_data = user_info_resp.json()
    user_email = user_data.get("email", "user@gmail.com")

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
            refresh_token=refresh_token
        )
        db.add(mailbox)
    else:
        mailbox.provider = "gmail"
        mailbox.auth_type = "oauth2"
        mailbox.access_token = access_token
        if refresh_token:
            mailbox.refresh_token = refresh_token

    db.commit()
    return RedirectResponse(url=f"http://localhost:5173/mailboxes?status=connected&email={user_email}")


@router.post("/test-send")
def send_test_email(payload: TestSendRequest, db: Session = Depends(get_db)):
    """Send a real test email using connected Gmail OAuth or SMTP mailbox."""
    mailbox = db.query(Mailbox).filter(Mailbox.id == payload.mailbox_id).first()
    if not mailbox:
        raise HTTPException(status_code=404, detail="Mailbox not found")

    res = email_service.send_mailbox_email(
        mailbox=mailbox,
        to_address=payload.to_email,
        subject=payload.subject,
        body=payload.body,
        db=db
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=f"Failed to send email: {res.get('error')}")

    return {
        "status": "success",
        "message": f"Test email sent successfully to {payload.to_email}",
        "message_id": res.get("message_id"),
        "sent_at": res.get("sent_at")
    }


@router.post("/{mailbox_id}/disconnect")
def disconnect_mailbox(mailbox_id: int, db: Session = Depends(get_db)):
    mailbox = db.query(Mailbox).filter(Mailbox.id == mailbox_id).first()
    if not mailbox:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    
    mailbox.auth_type = "disconnected"
    mailbox.access_token = None
    db.commit()
    return {"status": "success", "message": "Mailbox disconnected"}


@router.delete("/{mailbox_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mailbox(mailbox_id: int, db: Session = Depends(get_db)):
    mailbox = db.query(Mailbox).filter(Mailbox.id == mailbox_id).first()
    if not mailbox:
        raise HTTPException(status_code=404, detail="Mailbox not found")
    db.delete(mailbox)
    db.commit()
    return None
