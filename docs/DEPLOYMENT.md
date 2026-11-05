# Deployment runbook

The user deferred account setup on 2026-10-22. Nothing below has been deployed in this session.

## Prerequisites

Create personal/free projects in Supabase, LiveKit Cloud Build, Vercel Hobby, and Groq; optionally Google AI Studio for Gemini LLM/TTS. Confirm the account's model access and quota in each dashboard. Do not enable billing to make a model work. If access requires billing, keep that provider off and use the documented fallback.

Review the official links in ARCHITECTURE.md. Free plans can change or pause: Supabase has an inactivity policy; LiveKit Build cold-starts; Vercel Hobby is noncommercial. This architecture is for a personal portfolio, not an uptime commitment.

## Supabase

1. Apply the SQL files in `supabase/migrations` in filename order using the SQL editor or a linked Supabase CLI project. Use a separate test project first.
2. Enable anonymous sign-ins and email OTP/magic links. Set Site URL and allowed redirect URLs to the exact Vercel origin. Configure auth rate limits; enable CAPTCHA before promoting a high-traffic public demo (the current client does not yet render a CAPTCHA challenge).
3. Copy the URL and anon/publishable key to the frontend public variables. The service-role key belongs only on the Next server and Python worker.
4. Use a direct or session-pooler PostgreSQL connection string for `DATABASE_URL`, with TLS. Do not use transaction pooling for checkpoint migration. The worker uses `recall_private` as its search path; that schema is not exposed through PostgREST and browser roles have no privileges.
5. Apply every migration, including `202610230001_retention_and_ingestion.sql`. Enable pg_cron and schedule `select public.purge_expired_data()` every five minutes. Authenticated session history has 90-day retention. Expired guest content and orphaned private checkpoints are deleted, while minimal guest session admission records remain for the one-hour rate-limit window. Confirm cleanup on an expired test session and confirm repeated guest admissions remain limited after cleanup.
6. Set `demo_limits` conservatively. Defaults reserve 180 seconds/session, allow three concurrent sessions and three starts/hour per user or hashed IP, and reserve at most 800 monthly minutes. Provider requests have separate monthly and per-session ceilings. Reservations are deliberately not refunded after errors, preventing a reconnect loophole.

## Worker

1. Install LiveKit CLI from the official distribution, authenticate, and select the free Build project.
2. In `services/agent`, run `uv sync --extra voice`; run all tests and validate the Docker image on a running Docker engine.
3. Populate a local ignored secret file with `LIVEKIT_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `GROQ_API_KEY`, `LLM_PROVIDER=groq`, and a model ID confirmed in your account. The local default `qwen3:4b` is **not** a hosted Groq model ID.
4. Optional TTS: supply `GOOGLE_API_KEY`, `TTS_PROVIDER=gemini`, and `GEMINI_TTS_MODEL` only after verifying free-tier availability. With `TTS_PROVIDER=none`, the worker produces text rather than claiming spoken output.
5. Run `lk agent create` in `services/agent`, following the CLI's documented secret-file option. This creates the real `livekit.toml`. Commit that generated non-secret project/agent mapping. No invented agent ID is provided here.
6. Check worker health and logs. Verify it registers as `recall-voice`, accepts an admitted room, rejects a mismatched room, and exits/deletes the room at expiry.

The worker container installs model dependencies but no giant local LLM. Optional semantic embeddings require adding the embeddings extra and baking the chosen model into an image with sufficient memory/build-size allowance; the default hosted image uses lexical retrieval. Do not advertise pgvector semantic search as activated until the worker has an embedding model configured and indexed rows.

## Frontend

Configure the variables in `apps/web/.env.example`. `APP_ORIGIN` must exactly match the HTTPS deployment origin. Generate a high-entropy `IP_HASH_SECRET`. Leave `NEXT_PUBLIC_LOCAL_API_URL` empty in production. Never expose service-role or inference keys via `NEXT_PUBLIC_*`.

The web app deploys through Vercel's Git integration: connect the GitHub repository and set the Vercel root directory to `apps/web`. GitHub Actions does not deploy the web app, so there are no duplicate builds.

## GitHub Actions

Push this repository to the GitHub repository you choose. `Verify` runs checks without secrets. An actual successful GitHub run is still required; local build success does not prove Actions works.

Set a protected `production` environment and secrets:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `LIVEKIT_SECRET_LIST` in the format required by the official `livekit/deploy-action`

Set `APP_URL` to the actual verified HTTPS origin and `DEPLOY_ENABLED=true` only after initial manual setup and all release gates. The deployment workflow follows successful main-branch verification and uses its exact commit. Dependency updates are proposed through Dependabot.

## Release gates

- The deploy workflow always redeploys the LiveKit agent after a green `Verify` on `main` (it no longer diffs only the latest commit) and then runs the smoke script. Vercel deploys independently through its Git integration.
- Verify concurrent document uploads cannot exceed 100 chunks per owner through `ingest_document`.
- Anonymous admission rate/concurrency tests against real Postgres, including concurrent requests.
- An authenticated user cannot read/update/delete another user's memory via REST, RPC or server endpoints.
- A guest cannot read an expired or previous session, including checkpoints.
- Mic denial, disconnect/reconnect, quota exhaustion, provider 429/503 and cold starts produce honest UI states.
- English, Hindi, Telugu and mixed-language audio tests pass; language labels are updated only after evidence exists.
- Barge-in stops obsolete audio; the server ends the session at expiry even if the client timer is disabled.
- Measure p50/p95 from real worker metrics and test at least 20 conversations per language/device condition.
- Run `APP_URL` smoke script, then a real audio roundtrip. The smoke script alone only tests HTTPS/configuration/auth denial.
- Inspect provider dashboards for billed usage: it must remain zero. Stop the demo before activating billing or consuming credits as a substitute for free allowance.

Record the exact deployment URLs, tested commit, test date and actual metrics in VERIFICATION.md only after these steps succeed.
