import time
import logging
from typing import List, Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger(__name__)


class LLMServiceError(Exception):
    """Raised when an LLM completion call fails."""

    def __init__(self, message: str, status_code: int = 502, error_type: str = "ai_generation_error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type


class LLMService:
    """Service abstraction for LLM chat completions using Google Gemini API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self._client = None

    def is_mock_mode(self) -> bool:
        key = (self.api_key or "").strip()
        return not key or key in ("your-gemini-api-key-here", "your-openai-api-key-here", "mock-key", "none", "dummy")

    def _get_client(self):
        if self._client is None:
            if self.is_mock_mode():
                return None
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        response_format: Dict[str, Any] | None = None,
        temperature: float = 0.2,
    ) -> Tuple[str, Dict[str, int], int]:
        """
        Invoke Google Gemini generate_content API.
        Returns: (response_text, token_usage_dict, latency_ms)
        """
        if self.is_mock_mode():
            return self._mock_completion(messages, response_format)

        client = self._get_client()
        start_time = time.time()

        from google.genai import types
        from google.genai.errors import ClientError, APIError

        # Extract system instruction and conversation turns
        system_instruction = None
        contents = []

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                system_instruction = content
            elif role in ("assistant", "model"):
                contents.append(types.Content(role="model", parts=[types.Part.from_text(text=content)]))
            else:
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=content)]))

        config_kwargs: Dict[str, Any] = {
            "temperature": temperature,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if response_format and response_format.get("type") == "json_object":
            config_kwargs["response_mime_type"] = "application/json"

        config = types.GenerateContentConfig(**config_kwargs)

        # Build candidate list starting with primary configured model, then active fallbacks
        models_to_try = [self.model]
        for fallback in ["gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        last_error = None
        for current_model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=current_model,
                    contents=contents,
                    config=config,
                )
                latency_ms = int((time.time() - start_time) * 1000)
                raw_text = response.text or ""

                # Clean markdown backtick formatting if present
                clean_text = raw_text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                elif clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                usage = {
                    "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", 0) if response.usage_metadata else 0,
                    "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", 0) if response.usage_metadata else 0,
                    "total_tokens": getattr(response.usage_metadata, "total_token_count", 0) if response.usage_metadata else 0,
                }
                if current_model != self.model:
                    logger.info("Successfully completed generation using fallback model: %s", current_model)
                return clean_text, usage, latency_ms
            except (ClientError, APIError, Exception) as e:
                err_msg = str(e)
                last_error = e
                logger.warning("Gemini generation attempt with model '%s' failed: %s", current_model, err_msg)
                # Only fallback if model returned quota exhausted (429) or model not found (404)
                is_quota_or_model_error = "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "404" in err_msg or "NOT_FOUND" in err_msg
                if not is_quota_or_model_error:
                    break

        latency_ms = int((time.time() - start_time) * 1000)
        err_str = str(last_error) if last_error else "Unknown generation error"
        
        # Classify status code and message
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            raise LLMServiceError(
                "Gemini API rate limit / daily quota exceeded (429 RESOURCE_EXHAUSTED). Please check your Gemini plan or retry in a few moments.",
                status_code=429,
                error_type="quota_exhausted",
            )
        elif "401" in err_str or "UNAUTHENTICATED" in err_str:
            raise LLMServiceError(
                "Gemini API authentication failed (401 UNAUTHENTICATED). Please verify your GEMINI_API_KEY.",
                status_code=401,
                error_type="authentication_failed",
            )
        elif "403" in err_str or "PERMISSION_DENIED" in err_str:
            raise LLMServiceError(
                "Gemini API access denied (403 PERMISSION_DENIED).",
                status_code=403,
                error_type="permission_denied",
            )
        elif "404" in err_str or "NOT_FOUND" in err_str:
            raise LLMServiceError(
                f"Gemini model '{self.model}' is not available (404 NOT_FOUND).",
                status_code=404,
                error_type="model_not_found",
            )
        else:
            raise LLMServiceError(
                f"Gemini API generation failed: {err_str}",
                status_code=502,
                error_type="generation_error",
            )

    def _mock_completion(
        self,
        messages: List[Dict[str, str]],
        response_format: Dict[str, Any] | None = None,
    ) -> Tuple[str, Dict[str, int], int]:
        """Offline deterministic mock completion when no API key is configured."""
        usage = {"prompt_tokens": 50, "completion_tokens": 50, "total_tokens": 100}
        latency_ms = 10
        if response_format and response_format.get("type") == "json_object":
            return '{"concepts": [{"name": "Core Concept", "description": "Offline extracted concept"}], "questions": []}', usage, latency_ms
        return "I am your AI Study Companion Tutor. How can I assist your study today?", usage, latency_ms


_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

