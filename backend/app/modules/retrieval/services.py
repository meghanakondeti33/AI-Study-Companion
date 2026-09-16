import math
import logging
from dataclasses import dataclass
from typing import List, Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.materials.models import MaterialChunk
from app.modules.ai.embeddings import get_embedding_service, EmbeddingService

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    id: str
    material_id: str
    project_id: str
    page_number: int
    chunk_index: int
    content: str
    similarity: float

    @property
    def chunk_id(self) -> str:
        return self.id

    @property
    def similarity_score(self) -> float:
        return self.similarity


def _cosine_similarity_python(v1: Sequence[float], v2: Sequence[float]) -> float:
    """Compute cosine similarity between two numeric vectors in Python."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0.0 or norm_v2 == 0.0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)


class RetrievalService:
    """Service for semantic similarity search over project-scoped material chunks."""

    def __init__(self, embedding_service: EmbeddingService | None = None):
        self.embedding_service = embedding_service or get_embedding_service()

    def search_project_chunks(
        self,
        db: Session,
        project_id: str,
        query: str,
        user_id: str | None = None,
        top_k: int = 4,
        similarity_threshold: float = 0.50,
    ) -> List[RetrievedChunk]:
        """
        Search for most relevant chunks within the specified project.
        Enforces strict project isolation. Never returns chunks from other projects.
        """
        if not query.strip():
            return []

        # 1. Generate query embedding
        query_vectors = self.embedding_service.get_embeddings([query])
        if not query_vectors:
            return []
        query_vector = query_vectors[0]

        # 2. Check dialect
        bind = db.get_bind()
        dialect_name = bind.dialect.name if bind else "postgresql"

        results: List[RetrievedChunk] = []

        if dialect_name == "postgresql":
            # Native PostgreSQL pgvector cosine distance operator (<=>)
            distance_col = MaterialChunk.embedding.cosine_distance(query_vector).label("distance")
            stmt = (
                select(MaterialChunk, distance_col)
                .where(MaterialChunk.project_id == project_id)
                .where(MaterialChunk.embedding.isnot(None))
                .order_by("distance")
                .limit(top_k * 2)  # retrieve candidates then filter by threshold
            )
            rows = db.execute(stmt).all()
            for chunk, distance in rows:
                if distance is None:
                    continue
                # Cosine similarity is 1.0 - cosine_distance
                sim = 1.0 - float(distance)
                if sim >= similarity_threshold:
                    results.append(
                        RetrievedChunk(
                            id=chunk.id,
                            material_id=chunk.material_id,
                            project_id=chunk.project_id,
                            page_number=chunk.page_number,
                            chunk_index=chunk.chunk_index,
                            content=chunk.content,
                            similarity=round(sim, 4),
                        )
                    )
                if len(results) >= top_k:
                    break
        else:
            # In-memory cosine similarity for SQLite test environments
            chunks = (
                db.query(MaterialChunk)
                .filter(MaterialChunk.project_id == project_id)
                .filter(MaterialChunk.embedding.isnot(None))
                .all()
            )
            scored: List[RetrievedChunk] = []
            for chunk in chunks:
                raw_emb = chunk.embedding
                if raw_emb is None:
                    continue
                # Handle SQLite string representation or list
                if isinstance(raw_emb, str):
                    clean = raw_emb.strip("[]")
                    emb_vec = [float(x) for x in clean.split(",") if x.strip()]
                elif hasattr(raw_emb, "tolist"):
                    emb_vec = raw_emb.tolist()
                else:
                    emb_vec = list(raw_emb)

                sim = _cosine_similarity_python(query_vector, emb_vec)
                if sim >= similarity_threshold:
                    scored.append(
                        RetrievedChunk(
                            id=chunk.id,
                            material_id=chunk.material_id,
                            project_id=chunk.project_id,
                            page_number=chunk.page_number,
                            chunk_index=chunk.chunk_index,
                            content=chunk.content,
                            similarity=round(sim, 4),
                        )
                    )

            scored.sort(key=lambda x: x.similarity, reverse=True)
            results = scored[:top_k]

        logger.info(
            "Retrieval for project=%s returned %d chunks (threshold=%.2f)",
            project_id,
            len(results),
            similarity_threshold,
        )
        return results

    # Alias to support alternate naming conventions
    retrieve_relevant_chunks = search_project_chunks


_retrieval_service: RetrievalService | None = None


def get_retrieval_service() -> RetrievalService:
    global _retrieval_service
    if _retrieval_service is None:
        _retrieval_service = RetrievalService()
    return _retrieval_service
