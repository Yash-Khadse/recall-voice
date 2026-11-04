# Engineering Case Study: Recall Voice

## Overview
Recall Voice is a production-grade, multilingual AI Voice Workspace featuring real-time conversational speech, inspectable long-term agentic memory, and autonomous tool orchestration. It is architected with dual execution paths: a 100% free, offline local mode (Ollama + SQLite) and a scalable cloud mode (LiveKit + Supabase + Groq/Gemini).

---

## The Challenge
Most existing voice agent demonstrations suffer from three fundamental limitations:
1. **Opaque "Black Box" Memory**: Users have no visibility into what facts the AI remembers, no ability to correct errors, and no mechanism to revoke consent or delete entries.
2. **Fragile Cloud Dependencies**: Many voice agents rely entirely on expensive, proprietary cloud pipelines with recurring API charges and no viable local fallback.
3. **Unbounded Agent Loops**: LLM agents often lack deterministic boundaries, risking runaway loops, prompt injections into identity systems, or unsafe tool evaluations.

---

## System Architecture

```
                       ┌───────────────────────────────┐
                       │   Next.js Web UI (Port 3000)  │
                       └──────────────┬────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
       [ LOCAL MODE ]                                  [ CLOUD MODE ]
  • Runs locally on CPU                          • Cloud-native deployment
  • FastAPI + Uvicorn (:8000)                    • LiveKit Cloud (WebRTC)
  • Ollama (qwen3:4b / 1.7b)                     • Groq Whisper (STT) + Gemini (TTS)
  • SQLite local store                           • Supabase PostgreSQL + pgvector
  • Optional faster-whisper (CPU)                • Row-Level Security (RLS) & Auth
```

### 1. Dual-Path Execution
- **Local First**: Built to run entirely offline on standard developer hardware (CPU-only, no CUDA requirement) using Ollama, SQLite, and optional CPU-based Faster-Whisper.
- **Cloud Scale**: Seamlessly switches to WebRTC audio streaming via LiveKit Cloud, Groq Whisper STT, and Supabase Postgres with pgvector when deployed to production.

### 2. Transparent & Inspectable Memory
- Multi-category memory modeling: **semantic** (facts and preferences), **episodic** (contextual interactions), and **procedural** (workflows).
- User-in-the-loop controls: Explicit consent gating, real-time memory explorer, inline editing, granular deletion, and JSON export.
- Strict isolation: Anonymous guest sessions expire after 5 minutes with automated data purging, while authenticated sessions are protected by Row Level Security (RLS).

### 3. Bounded LangGraph Agent Loop
- The agent loop is orchestrated via a LangGraph state machine.
- Deterministic safety: Math expressions are evaluated with an AST parser rather than Python's unsafe `eval()`.
- Identity isolation: Tools cannot accept or spoof user identifiers; identity is bound authoritatively by server context.

---

## Key Technical Decisions & Trade-Offs

| Decision | Rationale | Trade-Off |
| :--- | :--- | :--- |
| **LangGraph Orchestration** | State-driven control with checkpointing and explicit tool boundaries. | Slight learning curve compared to standard linear prompt chains. |
| **LiveKit WebRTC vs. WebSocket** | Native WebRTC transport provides true full-duplex audio with sub-second latency and robust packet loss recovery. | Requires WebRTC gateway infrastructure (managed via LiveKit Cloud). |
| **Dual Local/Cloud Storage** | SQLite locally eliminates network dependencies; Supabase Postgres in cloud ensures durable multi-tenancy. | Maintaining two lightweight store adapters (`store.py` and `cloud_store.py`). |
| **Server-Derived Identity** | Tool inputs strictly prohibit the LLM from passing or selecting user IDs. | Requires rigorous server context propagation across all tool invocations. |

---

## Key Highlights & Outcomes

- **Full-Stack Implementation**: Production Next.js App Router interface paired with an asynchronous Python FastAPI/LiveKit backend.
- **Strict Multi-Tenancy**: Zero cross-tenant data leaks, verified via automated test suites covering authentication, quota enforcement, and permission boundaries.
- **Zero Cost Mandatory Baseline**: Designed to run indefinitely on free-tier allowances or completely offline on local hardware.
