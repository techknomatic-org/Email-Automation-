from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MailboxBase(BaseModel):
    username: str
    from_address: str
    host: str
    port: Optional[int] = 587
    imap_host: str
    imap_port: Optional[int] = 993
    signature: Optional[str] = ""
    daily_limit: Optional[int] = 50
    provider: Optional[str] = "smtp"
    auth_type: Optional[str] = "smtp_credentials"

class MailboxCreate(MailboxBase):
    password: str

class MailboxResponse(MailboxBase):
    id: int
    sent_today: int

    class Config:
        from_attributes = True
