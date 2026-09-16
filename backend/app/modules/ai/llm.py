import time
import logging
from typing import List, Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger(__name__)


class LLMServiceError(Exception):
    """Raised when an LLM completion call fails."""
    pass


class LLMService:
    """Service abstraction for LLM chat completions with telemetry measurement."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise LLMServiceError(
                    "OpenAI API key is not configured. Set OPENAI_API_KEY environment variable."
                )
            import openai
            self._client = openai.OpenAI(api_key=self.api_key)
        return self._client

    def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        response_format: Dict[str, Any] | None = None,
        temperature: float = 0.2,
    ) -> Tuple[str, Dict[str, int], int]:
        """
        Invoke OpenAI chat completions API.
        Returns: (response_text, token_usage_dict, latency_ms)
        """
        client = self._get_client()
        start_time = time.time()

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = client.chat.completions.create(**kwargs)
            latency_ms = int((time.time() - start_time) * 1000)

            choice = response.choices[0]
            content = choice.message.content or ""

            usage = {
                "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
                "completion_tokens": getattr(response.usage, "completion_tokens", 0),
                "total_tokens": getattr(response.usage, "total_tokens", 0),
            }
            return content, usage, latency_ms
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error("OpenAI chat completion failed: %s", e)
            raise LLMServiceError(f"LLM API generation failed: {e}") from e


_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
