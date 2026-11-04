# Implementation Roadmap & Acceptance Matrix

This document defines the implementation phases, deliverables, and acceptance criteria for Recall Voice.

## Phase Breakdown

| Phase | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- |
| **1. Architecture & Specs** | System architecture and trade-off analysis | Multi-tenant boundaries, security isolation, and alternative cloud/local paths documented. |
| **2. Monorepo Setup** | Unified workspace and dependency structure | Reproducible setup scripts, lockfiles, and automated testing commands for Python and Web. |
| **3. Real-Time Voice Pipeline** | LiveKit voice worker and WebRTC client | Bi-directional audio streaming, Voice Activity Detection (VAD), and graceful interruption handling. |
| **4. Multilingual Processing** | Language detection and code-switching | Support for English, Hindi, and Telugu with language preservation and fallback handling. |
| **5. LangGraph Agent & Tools** | Bounded autonomous agent loop | Safe arithmetic evaluation (AST), notes, tasks, reminders, and scoped document retrieval. |
| **6. Memory Persistence** | Multi-tier agentic memory system | Semantic, episodic, and procedural memory with user consent, correction, deletion, and export. |
| **7. Web Interface** | Next.js responsive application | Overview, conversation, memory explorer, session history, and settings with light/dark themes. |
| **8. Security & Rate Limiting** | Auth, quota protection, and tenant isolation | Atomic session admission, strict owner scoping, automatic expiry, and cross-owner access prevention. |
| **9. Cloud Deployment** | Hosted cloud infrastructure | Vercel frontend, LiveKit Cloud worker, Supabase PostgreSQL with Row Level Security (RLS). |
| **10. CI/CD Automation** | Automated verification and deployment workflows | GitHub Actions for linting, typing, unit/integration testing, security audit, and conditional deployment. |
| **11. Reliability & Observability** | Metrics and error handling | Graceful handling of microphone denial, quota limits, provider errors, and content-free timing metrics. |
| **12. Documentation** | Technical documentation suite | Architecture decisions, deployment runbook, security boundaries, and verification reports. |

## Module Architecture

The system is organized into decoupled, independently verifiable modules:
- **Core Engine (`services/agent/voice_agent/engine.py`)**: StateGraph-driven agent execution loop with deterministic tool execution.
- **Local & Cloud Storage (`services/agent/voice_agent/store.py`, `cloud_store.py`)**: Unified interface supporting SQLite for local runs and Supabase for cloud instances.
- **Voice Worker (`services/agent/voice_agent/worker.py`)**: Event-driven WebRTC voice agent with VAD and STT/TTS routing.
- **Web Application (`apps/web`)**: Next.js App Router frontend with server-side authorization and direct LiveKit WebRTC client integration.
