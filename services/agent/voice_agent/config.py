from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    data_dir: Path = Path(".data")
    llm_provider: Literal["ollama", "groq", "gemini"] = "ollama"
    llm_model: str = "qwen3:4b"
    llm_fallback_model: str = ""
    ollama_base_url: str = "http://localhost:11434"
    groq_api_key: str = ""
    google_api_key: str = ""
    local_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    session_seconds: int = Field(default=300, ge=30, le=300)
    max_session_requests: int = Field(default=30, ge=1, le=100)
    max_concurrent_sessions: int = Field(default=3, ge=1, le=20)
    embedding_model: str = ""
    whisper_model: str = "base"
    tts_provider: Literal["none", "gemini"] = "none"
    gemini_tts_model: str = "gemini-3.8-flash-lite-tts"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""


def model_for(settings: Settings, model_name: str = ""):
    name = model_name or settings.llm_model
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=name,
            base_url=settings.ollama_base_url,
            temperature=0.3,
            num_ctx=8192,
            num_predict=512,
            client_kwargs={"timeout": 45},
        )
    if settings.llm_provider == "groq":
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=name,
            api_key=settings.groq_api_key,
            max_tokens=512,
            temperature=0.3,
            max_retries=0,
            timeout=45,
        )
    if not settings.google_api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=name,
        api_key=settings.google_api_key,
        max_output_tokens=512,
        temperature=0.3,
        max_retries=0,
        timeout=45,
    )


def fallback_model_for(settings: Settings):
    """Optional second model used only when the primary raises before producing output."""
    name = settings.llm_fallback_model
    if not name or name == settings.llm_model:
        return None
    return model_for(settings, name)


def validate_hosted_model(settings: Settings, timeout: float = 5.0) -> str | None:
    """Return a problem description if the configured Groq models are not available.

    Never raises: a failed check must not stop the worker, only make the cause obvious in logs.
    """
    if settings.llm_provider != "groq" or not settings.groq_api_key:
        return None
    import httpx

    try:
        response = httpx.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            timeout=timeout,
        )
        response.raise_for_status()
        available = {item["id"] for item in response.json().get("data", [])}
    except Exception as error:
        return f"could not list Groq models: {error!r}"
    wanted = [settings.llm_model, settings.llm_fallback_model]
    missing = [name for name in wanted if name and name not in available]
    if missing:
        return f"configured model(s) not available to this Groq account: {', '.join(missing)}"
    return None
