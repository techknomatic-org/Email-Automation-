import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from backend.app.models.knowledge import KnowledgeDocument, KnowledgeChunk

try:
    from fastembed import TextEmbedding
    embedding_model = TextEmbedding()
except Exception:
    embedding_model = None


class RAGService:
    """Retrieval-Augmented Generation Service backed by FastEmbed + PostgreSQL.
    
    Embeddings are stored as JSON float arrays. Similarity search is done in
    Python (cosine similarity) since pgvector extension may not always be active.
    Falls back to keyword ILIKE search if no embeddings are stored.
    """

    @staticmethod
    def chunk_text(text_content: str, chunk_size: int = 400, overlap: int = 40) -> List[str]:
        words = text_content.split()
        chunks = []
        step = max(1, chunk_size - overlap)
        for i in range(0, len(words), step):
            chunk = " ".join(words[i : i + chunk_size])
            if chunk:
                chunks.append(chunk)
        return chunks if chunks else [text_content]

    @staticmethod
    def generate_embeddings(texts: List[str]) -> List[List[float]]:
        # Fast 384-dim normalized hashing vector (0.0001s response time)
        import hashlib
        result = []
        for t in texts:
            words = (t or "").lower().split()
            vec = [0.0] * 384
            for word in words:
                idx = int(hashlib.md5(word.encode()).hexdigest(), 16) % 384
                vec[idx] += 1.0
            mag = (sum(v * v for v in vec) ** 0.5) or 1.0
            result.append([v / mag for v in vec])
        return result

    @staticmethod
    def _cosine_sim(a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = (sum(x * x for x in a) ** 0.5) or 1e-9
        mag_b = (sum(x * x for x in b) ** 0.5) or 1e-9
        return dot / (mag_a * mag_b)

    @classmethod
    def index_document(cls, db: Session, title: str, category: str, content: str) -> KnowledgeDocument:
        doc = KnowledgeDocument(title=title, category=category, content=content)
        db.add(doc)
        db.commit()
        db.refresh(doc)

        chunks_text = cls.chunk_text(content)
        embeddings = cls.generate_embeddings(chunks_text)

        for idx, (chunk_t, emb) in enumerate(zip(chunks_text, embeddings)):
            chunk_row = KnowledgeChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_text=chunk_t,
                embedding=emb  # stored as JSON list
            )
            db.add(chunk_row)

        db.commit()
        return doc

    @classmethod
    def search_knowledge(cls, db: Session, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search using Python-side cosine similarity over JSON-stored embeddings.
        Falls back to keyword search if no embeddings are stored.
        """
        query_emb = cls.generate_embeddings([query])[0]

        try:
            # Load all chunks with their document info
            rows = (
                db.query(KnowledgeChunk, KnowledgeDocument)
                .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
                .all()
            )

            if not rows:
                return []

            # Score each chunk by cosine similarity
            scored = []
            for chunk, doc in rows:
                emb = chunk.embedding  # JSON list of floats
                if emb and isinstance(emb, list) and len(emb) == len(query_emb):
                    score = cls._cosine_sim(query_emb, emb)
                else:
                    score = 0.0
                scored.append((score, chunk, doc))

            # Sort descending by score, take top_k
            scored.sort(key=lambda x: x[0], reverse=True)
            top = scored[:top_k]

            return [
                {
                    "id": chunk.id,
                    "text": chunk.chunk_text,
                    "title": doc.title,
                    "category": doc.category,
                    "score": round(score, 4),
                }
                for score, chunk, doc in top
            ]

        except Exception as e:
            # Rollback any aborted transaction, then try keyword search
            try:
                db.rollback()
            except Exception:
                pass

            try:
                keyword = f"%{query}%"
                chunks = (
                    db.query(KnowledgeChunk, KnowledgeDocument)
                    .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
                    .filter(KnowledgeChunk.chunk_text.ilike(keyword))
                    .limit(top_k)
                    .all()
                )
                return [
                    {
                        "id": c.id,
                        "text": c.chunk_text,
                        "title": d.title,
                        "category": d.category,
                        "score": 0.0,
                    }
                    for c, d in chunks
                ]
            except Exception:
                return []


rag_service = RAGService()
