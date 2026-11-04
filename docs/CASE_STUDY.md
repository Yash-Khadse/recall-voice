# Recall Voice: engineering case study

## Problem

A voice assistant should keep useful context across sessions without making users surrender control of their memory. A recruiter should be able to inspect the interaction, understand what a tool actually did, and see clear failure states when free infrastructure is unavailable.

## Implementation

The project separates a Next.js interface and authorization layer from a hosted Python audio worker. LiveKit handles transport and turn-taking; LangGraph coordinates a bounded reasoning/tool loop. Ownership is bound before invoking tools. Supabase is the cloud store and SQLite is the local store. Long-term memory is distinct from graph checkpoints.

The memory lifecycle validates explicit facts, checks consent, deduplicates exact matches, corrects keyed facts, retrieves bounded context, and exposes user edits/deletion/export. Semantic embeddings are optional; lexical search is identified honestly when no embedding model is installed. Memory types label semantic, episodic and procedural records; automatic consolidation and high-quality multilingual extraction need additional evaluation.

## Decisions and challenges

- Free public compute must be independent of a laptop. LiveKit Build can host the worker but cold starts and quotas are product-visible constraints.
- Multilingual transcription does not prove multilingual spoken output. Each language remains experimental until the complete audio path is tested.
- Join-token TTL does not end an existing call. Database expiry and worker shutdown enforce runtime limits separately.
- Privileged database access still needs explicit owner filters. RLS alone does not protect service-role code.
- Small CPU models make a free local path practical, but tool correctness and latency must be measured on the actual machine.

## Evidence and limitations

An initial 12-test Python suite and 10-test frontend suite passed; the initial frontend production build succeeded. Further integration tests were added and remain pending. No real speech latency, deployment uptime or improvement percentage is claimed. See VERIFICATION.md for the exact boundary.

## Resume statements supported by current evidence

- Implemented a LangGraph tool workflow with owner-scoped SQLite persistence and tests for memory correction, deletion, consent, quota enforcement and deterministic calculation.
- Built a Next.js/TypeScript voice-workspace interface with memory controls, session states and server-side authorization routes; validated an initial production build and unit suite.

Do not add claims about a publicly deployed multilingual agent, production reliability, measured latency or pgvector quality until the release gates pass. No live demo or repository URL is available yet.

## Walkthrough to record after activation

Start an anonymous call; show permission onboarding and real connection states. Ask for a note and task, inspect the tool results, and show session isolation. Sign in, explicitly save a preference, reconnect, retrieve/correct/delete it, then demonstrate English, Hindi and Telugu with tested voices. Finish with quota exhaustion and architecture. Record only actual behavior; no synthetic success states.
