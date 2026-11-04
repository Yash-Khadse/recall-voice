# Verification ledger

Updated: 2026-10-23. These results describe the local session, not a public service.

## Latest verified run

- Python: **20 tests passed in 3.54 seconds**, including API isolation/persistence, controlled semantic ranking, cloud adapter scoping, expired checkpoint cleanup, dotenv speech settings and duration bounds. Ruff lint and formatting checks passed for all 15 Python files.
- Hosted worker: `import voice_agent.worker` succeeded with installed voice dependencies. This does not prove connection to a hosted room.
- Frontend: ESLint, TypeScript, **11 unit tests**, and production Next.js build passed after the document-upload changes.
- Playwright: **4 tests passed in 12.8 seconds** across desktop and mobile Chromium. Checks cover navigation, responsive width, privacy content and honest unavailable behavior without cloud configuration. The initial two failures were an ambiguous alert selector matching Next.js's accessibility announcer; the selector was narrowed and the complete suite rerun.
- Desktop and mobile overview screenshots were visually reviewed. Generated images are under `apps/web/test-results/` (ignored local artifacts).
- Fixed guest retention so hourly admission evidence survives content cleanup; added atomic owner-locked document ingestion; added local checkpoint cleanup and a cloud-worker deadline covering initialization. SQL changes still require real Postgres verification.
- Full 16,000-character multilingual document bodies now have a dedicated 65,536-byte HTTP limit, covered by a Hindi-text unit test.

Verification commands ran outside the Windows sandbox after sandbox temporary-directory and asynchronous-process failures. No remote services were activated.

## Evidence obtained

- Frontend dependency resolution, initial lint, TypeScript check, 10 Vitest tests and production `next build` succeeded. Next.js resolved to 16.4.2; React 19.3.1; LiveKit client 2.23.0; server SDK 2.19.2. TypeScript was held at 5.9.3 and ESLint 9.39.1 for the installed Next lint peer constraints.
- Initial Python core suite: **12 passed in 1.10 seconds** outside the sandbox. Tests covered isolation, quota/expiry, arithmetic safety, memory consent/dedup/correction/deletion, reminders, lexical retrieval and a LangGraph tool loop with a controlled model.
- Python source formatting/lint and byte compilation passed before the final integration additions. Final additions require a rerun.
- LiveKit 1.8.8 APIs were inspected from the installed packages. Groq STT supports `detect_language`; Gemini TTS accepts the configured model family. API inspection is not a working audio roundtrip.
- Impeccable's mechanical UI scan returned no findings for the initial UI source. This is not a screenshot/visual review.
- Hardware: Windows build 26200, Intel i7-1360P, about 16 GB RAM, Intel Iris Xe; WSL2 available, Docker engine stopped. Ollama was not found.

## Remaining integration checks

- Hosted worker runtime and container check (import alone passed).
- Real Postgres migrations, RLS and concurrent quota tests.
- Dependency vulnerability scans and actual GitHub Actions run.

Earlier restricted-environment attempts stalled, and earlier approval attempts hit an account usage limit. The latest unrestricted verification above succeeded. Automatic approval review separately rejected broadening deployment to always deploy both services; that change was not applied. Review the existing last-commit-only change detection before enabling deployment on multi-commit pushes.

## Deferred external evidence

Cloud accounts and repository publishing were explicitly deferred by the owner. No public HTTPS URL, hosted agent, activated Supabase project, provider credentials, recording, real speech tests or latency measurements exist.

All speech language labels remain experimental. Optional embedding and faster-whisper model downloads have not been benchmarked. The public deployment definition of done in REQUIREMENTS.md remains unmet.

## Resume verification

Run the README check commands on a normal terminal, fix any failures, then run DEPLOYMENT.md release gates after accounts are created. Record test output, commit SHA and measured conditions here. Update the ledger instead of treating generated source as evidence of a running system.
