import logging
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingServiceError(Exception):
    """Raised when embedding generation fails."""
    pass


class EmbeddingService:
    """Service abstraction for generating text embeddings."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        dimension: int | None = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.EMBEDDING_MODEL
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise EmbeddingServiceError(
                    "OpenAI API key is not configured. Set OPENAI_API_KEY environment variable."
                )
            import openai
            self._client = openai.OpenAI(api_key=self.api_key)
        return self._client

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of text strings in deterministic order."""
        if not texts:
            return []

        client = self._get_client()
        embeddings: List[List[float]] = []

        # Batch size for OpenAI embeddings (recommended <= 100 per request)
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                response = client.embeddings.create(
                    model=self.model,
                    input=batch,
                )
                # Sort by index to ensure deterministic order
                batch_embeddings = [
                    item.embedding
                    for item in sorted(response.data, key=lambda x: x.index)
                ]
                embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error("OpenAI embedding API call failed: %s", e)
                raise EmbeddingServiceError(f"Embedding generation error: {e}") from e

        return embeddings


_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
