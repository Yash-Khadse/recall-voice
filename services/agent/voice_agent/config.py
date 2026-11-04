from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    data_dir: Path = Path(".data")
    llm_provider: Literal["ollama", "groq", "gemini"] = "ollama"
    llm_model: str = "qwen3:4b"
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


def model_for(settings: Settings):
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=settings.llm_model,
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
            model=settings.llm_model,
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
        model=settings.llm_model,
        api_key=settings.google_api_key,
        max_output_tokens=512,
        temperature=0.3,
        max_retries=0,
        timeout=45,
    )
