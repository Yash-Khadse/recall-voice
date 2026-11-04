FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
ENV PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
WORKDIR /app
COPY pyproject.toml uv.lock ./
COPY voice_agent ./voice_agent
RUN uv sync --frozen --no-dev --extra voice
RUN useradd --create-home --uid 10001 agent && chown -R agent:agent /app
USER agent
RUN uv run python -m voice_agent.worker download-files
CMD ["uv", "run", "--no-sync", "python", "-m", "voice_agent.worker", "start"]
