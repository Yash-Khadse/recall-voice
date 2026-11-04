# Verification & Testing Ledger

This document tracks automated test results, manual validations, and remaining integration gates for Recall Voice.

## Automated Test Coverage

### Backend (Python Core & API)
- **Status**: 20 unit and integration tests passing.
- **Coverage Areas**:
  - API endpoint authentication, session lifecycle, and cross-owner isolation.
  - Safe arithmetic parsing rejecting arbitrary code and excessive expressions.
  - Memory persistence, consent enforcement, deduplication, correction, and deletion.
  - SQLite session quota management, expiry cleanup, and orphaned checkpoint purging.
  - Scoped document chunk retrieval and vector cosine similarity calculation.
  - Content-free metric measurement (p50 / p95 percentile latency tracking).
- **Code Quality**: Ruff lint and formatting checks passing across all Python modules.

### Frontend (Next.js & TypeScript)
- **Status**: 11 unit tests passing with Vitest; TypeScript and ESLint passing.
- **Coverage Areas**:
  - Client utility functions, error formatting, and timer calculations.
  - Server-side security helpers, IP hashing, and request bounds.
  - Multilingual document size restrictions and input validation.
- **Build**: Production build (`next build`) compiles successfully with full static and dynamic route optimization.

### End-to-End (Playwright)
- **Status**: 4 tests passing across desktop and mobile Chromium viewports.
- **Coverage Areas**:
  - Landing navigation and responsive sidebar-to-bottom layout transitions.
  - Honest status reporting when cloud credentials are unconfigured.
  - Privacy notices, terms disclosure, and memory consent toggles.

---

## Architecture Validation

- **LiveKit Agent Worker**: Package imports and worker lifecycle verified. Connects cleanly to room instances when credentials are provided.
- **Multi-Tenant Scoping**: Database schemas (`recall_private`) and Row Level Security policies ensure isolated namespaces between anonymous and authenticated sessions.
- **Document Chunking**: Atomic owner-locked document ingestion enforcing chunk boundaries and payload size limits.

---

## Pre-Production Release Gates

The following verification steps are required prior to activating public production deployment:
1. Complete migration apply on a live Supabase PostgreSQL instance and verify `recall_private` schema isolation.
2. Confirm `purge_expired_data()` cron schedule execution and atomic demo admission limits.
3. Validate live audio streaming and barge-in responsiveness with active LiveKit Cloud and Groq STT credentials.
4. Verify browser speech synthesis and Gemini TTS fallback across targeted languages (English, Hindi, Telugu).
5. Run the repository smoke test against the final deployed HTTPS URL.
