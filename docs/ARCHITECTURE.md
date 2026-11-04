# Architecture decision record — 2026-10-22

Status: implementation selected; external service activation and production validation deferred by user.

## Decision and two reviews

| Component | Engineering review | Operational review / alternative |
| --- | --- | --- |
| Next.js on Vercel Hobby | Server routes keep signing and authorization out of browser; React UI integrates LiveKit. | Personal portfolio fits noncommercial Hobby. Limits pause service. Cloudflare Workers is a credible alternative, but requires a different Next runtime adapter. |
| LiveKit Python Agents | WebRTC, VAD, interruption and SDK-managed audio lifecycle; LangGraph adapter avoids a second voice loop. | Build has 1,000 agent session minutes and cold starts; verify account allowance before activation. A self-hosted server is free software but requires hosted compute, so it is the local alternative, not a claimed free public host. |
| Groq multilingual Whisper | Transcription endpoint preserves language; leave language unset for auto detection. VAD chunks adapt batch STT to interactive voice, not native partial STT. | Free-tier request limits apply; large-v3-turbo versus large-v3 trades speed for accuracy. Local faster-whisper CPU int8 is the offline alternative. |
| Groq / Gemini LLM, Ollama local | Provider adapters and bounded LangGraph tool loops. | Credentials stay server-side. Free quota and available models must be verified against the activated account. No paid fallback. Ollama requires model download and adequate RAM. |
| Browser speech fallback | Only use a voice actually present for the requested language; text remains usable. | Not equivalent to verified server TTS; OS/browser voices vary. Gemini TTS has free-tier entries, but runtime model access must be verified. Kokoro does not cover all target languages; IndicF5 reference audio and CPU requirements prevent an untested default. |
| Supabase Postgres + pgvector | RLS, durable records and atomic admission quotas; privileged code still scopes by owner/session. | Free 500 MB database, inactivity pausing, limited egress. SQLite is the offline alternative; no attempt to persist SQLite on ephemeral Vercel disks. |
| Local embedding model | Local semantic embeddings avoid per-request billing. Bounded retrieval and explicit provenance. | Model download and CPU cost; lexical fallback must identify itself and is not represented as semantic retrieval. |

## Component boundaries

`apps/web`: landing, conversation, memory, history, settings, authenticated server routes and LiveKit token issuance.

`services/agent`: Python business logic, SQLite/local API, LangGraph tools and hosted LiveKit worker. Local API is only a local execution service, not a required public always-on API.

`supabase/migrations`: database schema, RLS, transactional admission and durable reminders.

Public: browser → Next routes / Supabase Auth → signed restricted LiveKit room → hosted Python worker → inference + owner-scoped Postgres. The local computer is not in this path.

Local: browser → local FastAPI → the same graph, tools and SQLite store → Ollama; optional self-hosted LiveKit and faster-whisper.

## Security boundaries

Anonymous demo admission uses server-side durable limits and isolated session IDs. Token room metadata is server-authored. The worker validates the session in storage rather than accepting participant-provided user IDs. Restrict grants to the assigned room. Session expiry is enforced in worker and request handlers. Never trust model tool arguments for identity. Destructive tools require a separately confirmed action. No remote URLs or arbitrary filesystem paths accepted by document ingestion. Treat retrieved documents as untrusted data.

## Official sources reviewed

- https://docs.livekit.io/deploy/admin/quotas-and-limits/
- https://docs.livekit.io/agents/models/llm/langchain/
- https://docs.livekit.io/agents/logic/sessions/
- https://console.groq.com/docs/speech-to-text
- https://ai.google.dev/gemini-api/docs/pricing
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://vercel.com/docs/plans

Account-specific availability, multilingual quality and latency are release gates, not inferred from vendor marketing. User deferred account setup on 2026-10-22.
