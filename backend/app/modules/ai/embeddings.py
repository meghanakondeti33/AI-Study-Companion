import hashlib
import math
import logging
from typing import List
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingServiceError(Exception):
    """Raised when embedding generation fails."""
    pass


class EmbeddingService:
    """Service abstraction for generating text embeddings using Google Gemini API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        dimension: int | None = None,
    ):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_EMBEDDING_MODEL
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        self._client = None

    def is_mock_mode(self) -> bool:
        """Check if service should operate in mock mode without external API calls."""
        key = (self.api_key or "").strip()
        return not key or key in ("your-gemini-api-key-here", "your-openai-api-key-here", "mock-key", "none", "dummy")

    def _generate_deterministic_mock_embedding(self, text: str) -> List[float]:
        """
        Generate a deterministic unit-normalized vector matching self.dimension (1536)
        based on the text SHA-256 hash. Enables offline development and testing
        with native PostgreSQL pgvector operations.
        """
        dim = self.dimension
        hasher = hashlib.sha256(text.encode("utf-8"))
        digest = hasher.digest()

        vec: List[float] = []
        for i in range(dim):
            byte_val = digest[i % len(digest)]
            val = math.sin((i + 1) * (byte_val + 1))
            vec.append(val)

        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [round(x / norm, 6) for x in vec]
        return vec

    def _get_client(self):
        if self._client is None:
            if self.is_mock_mode():
                return None
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of text strings using native output_dimensionality."""
        if not texts:
            return []

        if self.is_mock_mode():
            logger.info("Generating %d deterministic mock embeddings (mock mode)", len(texts))
            return [self._generate_deterministic_mock_embedding(t) for t in texts]

        client = self._get_client()
        embeddings: List[List[float]] = []

        from google.genai import types

        config = types.EmbedContentConfig(output_dimensionality=self.dimension)
        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            contents_list = [types.Content(parts=[types.Part.from_text(text=t)]) for t in batch]
            try:
                response = client.models.embed_content(
                    model=self.model,
                    contents=contents_list,
                    config=config,
                )
                for item in response.embeddings:
                    embeddings.append(list(item.values))
            except Exception as e:
                logger.error("Gemini embedding API call failed: %s", e)
                raise EmbeddingServiceError(f"Embedding generation error: {e}") from e

        return embeddings


_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service

