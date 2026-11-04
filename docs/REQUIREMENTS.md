# Product Requirements & Engineering Specification

## 1. Executive Summary

Recall Voice is an open-source, full-stack, multilingual AI Voice Workspace designed to deliver real-time voice conversations, inspectable long-term agentic memory, and autonomous tool orchestration. 

The system provides two distinct, first-class runtime modes:
1. **Local Mode**: Fully offline, free, and CPU-compatible using Ollama, SQLite, and local audio fallback.
2. **Cloud Mode**: Cloud-native deployment utilizing LiveKit Cloud (WebRTC), Supabase PostgreSQL (`pgvector`), Groq Whisper STT, and Google Gemini TTS/LLM.

---

## 2. Core Functional Requirements

### 2.1 Real-Time Conversational Voice
- **WebRTC Transport**: Sub-second full-duplex audio communication using the LiveKit Agents SDK.
- **Voice Activity Detection (VAD)**: Integration with Silero VAD for accurate speech boundary and turn detection.
- **Interruption / Barge-in**: Immediate cancellation of outgoing audio playback when the user starts speaking.
- **Multilingual Recognition & Generation**:
  - Primary target languages: English, Hindi, and Telugu.
  - Automatic language identification with support for mixed code-switching.
  - Spoken response preserved in the user's detected language.

### 2.2 Agentic Memory System
- **Categorized Memory Storage**:
  - *Semantic Memory*: Facts, personal preferences, and biographical details.
  - *Episodic Memory*: Contextual conversation events and summaries.
  - *Procedural Memory*: User workflow habits and formatting preferences.
- **Inspectable & User-Controlled**:
  - Live Memory Explorer UI displaying all stored memory records.
  - Full CRUD operations: search, inline editing, granular deletion, and JSON export.
- **Consent & Privacy Gating**:
  - Memory persistence is disabled by default; requires explicit user opt-in toggle.
  - Anonymous guest sessions expire after 5 minutes with automatic data purging.

### 2.3 Bounded Tool Orchestration
- **LangGraph State Machine**: Orchestrates reasoning and tool selection with execution bounds.
- **Supported Tools**:
  - *Safe Calculator*: Pure AST-parsed arithmetic evaluation without `eval()`.
  - *Task & Note Manager*: Structured creation, updating, and retrieval of to-do items.
  - *Durable Reminders*: In-app scheduled notification records.
  - *Knowledge Ingestion & RAG*: Document chunking with semantic vector and lexical retrieval.
- **Identity Isolation**: Tools cannot accept user-supplied identity parameters; ownership is authoritatively bound by server context.

---

## 3. System Architecture & Dual Runtime

### 3.1 Local Architecture (Offline / CPU)
- **Frontend**: Next.js App Router on `http://localhost:3000`.
- **Backend API**: Python FastAPI service on `http://127.0.0.1:8000`.
- **Inference**: Ollama running locally (`qwen3:4b` or `qwen3:1.7b`).
- **Persistence**: SQLite database stored locally in `.data/` with write-ahead logging (WAL).
- **Speech Options**: Turn-based audio recording with CPU Faster-Whisper and browser speech synthesis.

### 3.2 Cloud Architecture (Hosted / Production)
- **Web Layer**: Next.js deployed on Vercel Hobby with server-side API routes.
- **Voice Layer**: LiveKit Cloud Build room dispatching to a containerized Python agent worker.
- **Inference**: Groq Whisper Large v3 Turbo for STT; Groq / Gemini for LLM; optional Gemini Flash for TTS.
- **Persistence**: Supabase PostgreSQL with `pgvector`, Row Level Security (RLS), and private schemas (`recall_private`).

---

## 4. Security, Multi-Tenancy & Cost Protection

### 4.1 Cost Constraints
- **Zero Mandatory Spend ($0)**: The entire stack must operate within standard free-tier allowances or completely offline.
- **Rate & Quota Limiting**:
  - Hard caps on session duration (e.g. 180 seconds for anonymous demo calls).
  - Maximum 3 concurrent active sessions and rate limiting per IP hash.
  - Monthly reservation caps to prevent provider quota exhaustion.

### 4.2 Security Architecture
- **Secret Isolation**: Privileged service-role keys and inference tokens reside strictly on server runtimes and workers; never exposed via `NEXT_PUBLIC_` variables.
- **Database Hardening**: Checkpoint tables and private worker state reside in a non-PostgREST schema (`recall_private`).
- **Input Sanitization**: Strict size and character limits on all incoming audio buffers, text payloads, and document uploads.

---

## 5. User Experience & Design Specifications

- **Responsive Workspace**: Seamless desktop sidebar layout transitioning to bottom navigation on mobile viewports.
- **Live Visual State**: Explicit indicators for connection state (`Not connected`, `Connecting`, `Connected`), audio activity, and tool execution traces.
- **Accessibility**: Full keyboard navigation, visible focus indicators, screen-reader announcements, and `prefers-reduced-motion` compliance.
- **Theming**: Integrated light and dark modes with persistent local preference.

---

## 6. Verification & Quality Standards

- **Automated Testing**:
  - Python test suite verifying API security, store isolation, arithmetic safety, and LangGraph loops.
  - Vitest frontend suite covering utility logic, security helpers, and input bounds.
  - Playwright E2E browser tests across desktop and mobile Chromium viewports.
- **Linting & Type Safety**:
  - Python: Ruff linting and formatting.
  - TypeScript: Strict compilation with `tsc --noEmit` and ESLint.
- **CI/CD**: GitHub Actions workflow validating all test suites, Docker container builds, and security audits on pull requests and pushes to main.
