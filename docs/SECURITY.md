# Security review and release boundaries

This is a code review of an unactivated deployment, not a penetration-test certification.

## Identity and access

Next routes validate bearer tokens with Supabase `getUser`; browser-supplied owner IDs are never accepted. RLS restricts permanent users to their own rows. Anonymous users do not receive direct table access. Worker service-role queries include validated owner identity, and anonymous queries include the admitted session ID. Record IDs alone are never authorization.

Room metadata is a locator, not proof of identity. The worker looks up the admitted session, checks its room, participant and expiry. Tokens have a 60-second join TTL and grants for a single room. The join token's expiry does not disconnect an existing call, so the worker separately monitors the database and closes expired sessions.

Mutation routes validate an exact origin and read bounded JSON. IP admission uses HMAC of Vercel's overwritten forwarded header; outside Vercel, a single shared bucket is used rather than trusting arbitrary forwarded headers. Do not deploy behind another proxy without implementing its trusted-address contract.

## Costs

A database row lock serializes session admission and provider-budget reservations. Every LLM call and each STT/TTS request must reserve budget before inference. Provider retries are disabled in configured adapters. HTTP 429 is not blindly retried. Application limits complement, but cannot replace, a provider account with billing disabled. Monitor actual provider dashboards before public launch.

## Memory and tools

The model receives a fixed set of tools with bounded Pydantic input. Identity is captured server-side, never supplied by a tool call. Calculation uses an AST allowlist with no calls, names, exponentiation or `eval`. Document ingestion accepts plain text, not paths or URLs. Retrieved material is labeled untrusted and is not executed.

Explicit memory requires consent. A keyword filter refuses some common sensitive facts, but **it is not comprehensive multilingual sensitive-data detection**. Do not enter secrets or sensitive personal information into the public demo. Deleting a memory does not necessarily erase the historical transcript where the fact was originally said; export/deletion UX must keep this distinction visible.

The agent has no destructive tool. User-facing record deletion requires a separate confirmation. Notes, tasks and reminders are internal records, with no email/calendar/account side effects. All external integrations are intentionally absent.

## Persistence

Local tokens are stored only as SHA-256 digests. Local personal mode requires the server-configured key; the browser holds it only in component memory. SQLite files are ignored by Git. The local service must remain bound to loopback.

Cloud graph checkpoints use the `recall_private` schema, with privileges revoked from public/browser roles. The worker removes its thread at normal shutdown. Abrupt crashes can leave checkpoints: configure a database retention job for orphaned private checkpoint rows before production. Public retention deletes expired guest sessions and cascades their business records; it is not sufficient by itself for crashed private checkpoints.

Raw audio is not intentionally recorded by the application. Provider processing and logging are governed by their policies. LiveKit recording is disabled in the worker. Review project-level observability settings for transcript retention before public exposure.

## Open release checks

- Execute SQL migrations and RLS tests against real Postgres, including service-role ownership paths and simultaneous admission.
- Run the final regression suites and browser tests outside the restricted execution environment.
- Verify error handling from each real provider, TTS request counts, streaming cancellation and disconnected-room cleanup.
- Configure CAPTCHA/auth quotas before broad public sharing; the current sign-in component does not integrate a CAPTCHA widget.
- Run dependency audits and container scans on the actual lockfiles; scan results are not yet available.
- Pin deployment actions to reviewed immutable revisions before enabling production secrets.
- Check provider free-tier policies and spending controls at activation time.

Do not enable deployment while these release checks are unresolved.
