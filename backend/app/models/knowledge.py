from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    category = Column(String(100), default="General")
    content = Column(Text, nullable=False)
    file_type = Column(String(20), default="text")
    created_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, default=0)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True) # Stores 384-dim embedding float array
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("KnowledgeDocument", back_populates="chunks")
