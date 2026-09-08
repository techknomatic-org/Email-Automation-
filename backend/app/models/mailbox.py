from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Mailbox(Base):
    __tablename__ = "mailboxes"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(200), unique=True, index=True, nullable=False)
    from_address = Column(String(200), nullable=False)
    password = Column(String(200), nullable=False)
    host = Column(String(200), nullable=False)
    port = Column(Integer, default=587)
    imap_host = Column(String(200), nullable=False)
    imap_port = Column(Integer, default=993)
    provider = Column(String(50), default="smtp")   # "gmail" or "smtp"
    auth_type = Column(String(50), default="smtp_credentials")  # "oauth2" or "smtp_credentials"
    refresh_token = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    signature = Column(Text, nullable=True)
    daily_limit = Column(Integer, default=50)
    sent_today = Column(Integer, default=0)
    next_send_at = Column(DateTime, nullable=True)

    deals = relationship("Deal", back_populates="mailbox")
    messages = relationship("Message", back_populates="mailbox")


class Thread(Base):
    __tablename__ = "threads"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(300), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    deals = relationship("Deal", back_populates="thread")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    mailbox_id = Column(Integer, ForeignKey("mailboxes.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(Integer, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(String(300), index=True, default="")
    direction = Column(String(10), default="outbound") # inbound / outbound
    subject = Column(String(300), default="")
    body = Column(Text, default="")
    sent_at = Column(DateTime, default=datetime.utcnow)

    mailbox = relationship("Mailbox", back_populates="messages")
    thread = relationship("Thread", back_populates="messages")
