"""CPU-compatible turn-based STT fallback, loaded only when explicitly used."""

import io
from functools import lru_cache

from .config import Settings


@lru_cache(maxsize=1)
def whisper():
    from faster_whisper import WhisperModel

    return WhisperModel(Settings().whisper_model, device="cpu", compute_type="int8")


def transcribe(audio, language="auto"):
    if len(audio) > 3_000_000:
        raise ValueError("Audio clip exceeds 3 MB")
    segments, info = whisper().transcribe(
        io.BytesIO(audio),
        language=None if language == "auto" else language,
        vad_filter=True,
        beam_size=1,
    )
    return {
        "text": "".join(segment.text for segment in segments).strip(),
        "language": info.language,
    }
