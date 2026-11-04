# Implementation and acceptance contract

The authoritative requested scope is REQUIREMENTS.md. No deployment success is implied by source code being present.

| Phase | Deliverable | Acceptance |
| --- | --- | --- |
| 1 | Architecture and comparison | Official source review and alternatives recorded |
| 2 | Monorepo, dependencies and setup | Reproducible installation, build and test commands |
| 3 | LiveKit voice worker and browser | Real English audio roundtrip; requires configured providers |
| 4 | Language routing | Recorded English/Hindi/Telugu and code-switch tests; experimental until passed |
| 5 | LangGraph and tools | Validated calculations, notes, tasks, reminders, memory and document search; bounded execution |
| 6 | Memory persistence | Cross-session, correction, deletion, scoped retrieval tests; RLS integration gate |
| 7 | Complete UI | Responsive landing/conversation/memory/history/settings; errors and keyboard controls |
| 8 | Auth and quota protection | Atomic quota tests, cross-owner denial, server expiry and consent |
| 9 | Public deployment | Deferred by user until accounts exist; verified HTTPS and hosted worker required |
| 10 | CI/CD | Local-equivalent checks and secret-gated deployment; actual Actions run pending repository |
| 11 | Reliability | Failure tests and measured metrics; no invented audio benchmarks |
| 12 | Portfolio docs | Honest case study, deployment runbook and verification ledger |

Implementation proceeds by independent modules: Python core with tests; UI; server/storage; then integration, full checks and documentation. The claude-mem work_state_write tool is not exposed in this session (tool inventory searched); this document records the acceptance contract, not a claim of completed phases.
