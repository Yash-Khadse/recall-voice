# BUILD: MULTILINGUAL REAL-TIME AI VOICE AGENT WITH AGENTIC MEMORY

## MISSION

Act as a team of principal AI architects, real-time voice engineers, senior Python developers, LangGraph specialists, full-stack engineers, DevOps engineers, cybersecurity engineers, QA engineers, and product designers.

Build a complete, working, publicly deployed AI Voice Agent with persistent agentic memory, multilingual speech, intelligent tool orchestration, and a premium user experience.

This is a portfolio and resume project intended to demonstrate advanced AI engineering capabilities to technical recruiters and interviewers.

Do not build a toy chatbot, mock demonstration, or disconnected prototype.

Deliver working software with a publicly accessible HTTPS URL, reproducible local setup, documented architecture, automated tests, and CI/CD.

## 1. CONFIRMED REQUIREMENTS

The following requirements have already been confirmed:

- Development OS: Windows.
- GPU: Unknown; do not assume an NVIDIA GPU exists.
- Deployment: Both local and publicly accessible cloud deployment.
- Target users: Portfolio visitors, recruiters, technical interviewers, and the developer.
- Speech: Multilingual with automatic language detection.
- Priority languages: English, Hindi, and Telugu.
- Additional languages: Support through a verified, extensible multilingual architecture.
- Backend language: Python.
- Core capabilities: Voice interaction, LangGraph orchestration, long-term memory, RAG, tool calling, and secure persistence.
- Financial requirement: $0 mandatory spending.
- Public access: The hosted demo must operate independently of the developer's Windows computer.

Do not ask me these questions again.

Only ask additional questions if the answer materially changes the architecture or requires authorization.

## 2. NON-NEGOTIABLE GOALS

1. Real-time, natural, spoken conversations.
2. Streaming speech recognition and audio output.
3. Reliable interruption handling and conversational turn-taking.
4. Multilingual recognition and generation.
5. Intelligent agentic memory across sessions.
6. Functional autonomous tool selection and execution.
7. Browser-based voice interface.
8. Persistent memory database.
9. A working publicly accessible demo.
10. Automated deployment from GitHub.
11. Security, privacy and quota protection.
12. A fully free local execution path.

Make the publicly deployed demo the primary portfolio deliverable.

A system that only works when my local laptop is running does not satisfy the deployment requirement.

## 3. RESEARCH THE BEST CURRENT TECH STACK

Before coding, verify current versions, APIs, limitations, compatibility and licensing using official sources.

Start with these preferred options:

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Motion or an equivalent animation library

Voice:
- LiveKit Agents
- LiveKit Cloud
- WebRTC
- Silero VAD
- LiveKit turn detection where appropriate

Backend:
- Python
- FastAPI for endpoints that genuinely require it
- Pydantic
- AsyncIO
- LangGraph
- LangChain integrations where beneficial

STT:
- Groq Whisper Large v3 Turbo
- Whisper Large v3
- Faster-Whisper for local execution

LLM:
- A currently available Gemini free-tier model
- Groq free-tier models
- Ollama for local execution

TTS:
- Verified LiveKit-compatible TTS models within the free allowance
- Kokoro for supported local languages
- IndicF5 or another verified multilingual open model for Indian languages
- Browser SpeechSynthesis as a documented compatibility fallback

Database:
- Supabase PostgreSQL
- pgvector
- Supabase Auth
- SQLite and local vector storage for offline operation

Hosting:
- Vercel Hobby for the frontend and lightweight token endpoints
- LiveKit Cloud Build for the Python voice-agent worker
- Supabase Free for persistent state

CI/CD:
- GitHub Actions
- Vercel Git deployment
- LiveKit CLI deployment

These are initial recommendations, not immutable requirements.

Research credible alternatives and replace any technology that is incompatible, unsuitable, deprecated or no longer free.

Produce a final architecture decision record before implementation.

## 4. PUBLIC DEPLOYMENT ARCHITECTURE

Design the application around these separately deployable components:

### A. Frontend

Deploy the Next.js application to Vercel.

Responsibilities:

- Public landing page
- Live voice conversation interface
- User authentication
- Agent status
- Streaming transcripts
- Conversation history
- Memory dashboard
- Settings
- Demo onboarding
- Session limits
- Graceful error states

### B. Real-Time Voice Agent

Deploy a Python LiveKit Agents worker to LiveKit Cloud's free Build plan.

Responsibilities:

- Real-time speech processing
- Turn-taking and interruptions
- STT integration
- LLM orchestration
- TTS integration
- Agent and tool execution
- Session lifecycle
- Interaction metrics

The agent must run in the cloud.

Do not require a personal computer, personal network tunnel, or manually running local process to serve public visitors.

### C. Secure Application Services

Use Next.js server endpoints or other suitable server-side infrastructure for lightweight operations such as:

- Authenticated LiveKit access-token creation
- Demo session authorization
- Rate and quota enforcement
- User settings
- Auth-related operations

Avoid deploying an always-on FastAPI service purely to provide a few small HTTP endpoints.

If an independent Python API is necessary, research a verified free hosting option and document its cold-start, persistence, compute and bandwidth limitations.

The Python agent and reusable Python application services should remain modular.

### D. Persistent Storage

Use Supabase PostgreSQL and pgvector.

Persist:

- Users
- Sessions
- Messages
- Memory records
- Embeddings
- Notes
- Tasks
- Reminders
- Tool results
- Preferences

Implement Row Level Security and enforce ownership on every access path, including privileged server code.

Never trust user IDs supplied by the browser without authentication.

### E. External Inference

Use verified free-tier model APIs through provider adapters.

Separate:

- STT
- LLM
- TTS
- Embeddings

Cloud inference must use dedicated server-side credentials.

Do not require a paid subscription for normal demo operation.

## 5. PUBLIC DEMO MODE

Implement a special public-demo experience designed for recruiters.

A recruiter should be able to visit the deployed website and try the project quickly.

Features:

- Prominent "Try Voice Agent" button
- Microphone permission onboarding
- Optional anonymous demo session
- Immediate display of session connection status
- Example prompts
- Voice and text interaction
- Limited but functional tool access
- Demonstration of short-term memory
- Clear explanation of long-term memory
- Session timer
- Quota-aware graceful fallback

Suggested demo session duration: 3–5 minutes.

Implement configurable:

- Maximum demo duration
- Concurrent demo session limit
- Per-user session frequency
- Global monthly quotas
- Provider request budgets
- Abuse protection

Use server-enforced limits, not client-only timers.

Do not use easily resettable browser storage as the only abuse prevention.

Create two identity modes:

**Anonymous demo mode**

- Per-session isolated data.
- Ephemeral memories and notes.
- Automatic expiration.
- No access to other users' information.
- No access to real external accounts.
- Safe demonstration tools.

**Authenticated mode**

- Persistent user-owned conversation history.
- Long-term memory.
- Notes, tasks and reminders.
- Configurable privacy and memory settings.
- User-controlled memory deletion.

If authentication is not initially available, implement a secure anonymous demonstration first without exposing persistent personal data.

Display appropriate messaging when free-tier quotas are exhausted.

Never falsely show a working voice interface when the backend is unavailable.

Provide a useful text-only fallback and an optional recorded product walkthrough.

## 6. MULTILINGUAL VOICE REQUIREMENTS

Implement automatic spoken-language recognition.

Prioritize end-to-end tests for:

- English
- Hindi
- Telugu

Support:

- Native-language speech input
- Native-language transcripts
- Natural responses in the detected or selected language
- Manual language override
- Optional language selection
- Mixed-language utterances
- Code-switching such as Hinglish
- Language preferences stored in memory

Do not automatically translate all input to English unless the agent requires an internal representation.

Preserve the original user utterance and optionally store a translated representation separately.

Handle non-Latin scripts correctly across the frontend, databases and tool outputs.

STT requirements:

- Evaluate Whisper multilingual accuracy.
- Ensure language auto-detection is actually enabled.
- Do not leave an STT provider hardcoded to English.
- Measure transcription errors for Indian accents.
- Test Hindi and Telugu transcripts.

TTS requirements:

- Verify that every advertised language has a working voice.
- Map languages to compatible voices.
- Support different voice providers by language.
- Do not assume Kokoro supports every language.
- Evaluate IndicF5 for Hindi, Telugu and other Indian languages.
- Validate model licenses and any reference-audio requirements.
- Benchmark local CPU performance.
- Use a supported cloud voice where the free allowance permits.
- Provide browser speech fallback only when an appropriate browser voice is available.
- Provide text output when spoken output cannot be supported reliably.

Do not advertise a language as fully supported until speech input, agent reasoning and speech output have passed an end-to-end test.

Separate experimental languages from verified languages in the interface.

## 7. AGENTIC MEMORY SYSTEM

Memory is the central differentiating capability.

Implement:

### Working memory
Active conversational state, turn context, pending tool calls and short-term information.

### Episodic memory
Important past conversations and events, linked to their original sessions.

### Semantic memory
Persistent user facts, preferences, interests and goals.

### Procedural memory
User-approved workflows, response preferences and recurring task patterns.

Use LangGraph checkpointing for stateful conversation execution.

Persist long-term memory separately.

Implement a structured memory lifecycle:

Extract → Validate → Classify → Deduplicate → Store → Retrieve → Re-rank → Update or Forget.

Each record should include appropriate:

- User ownership
- Memory type
- Content
- Embedding
- Confidence
- Importance
- Timestamp
- Source
- Updated timestamp
- Expiration or supersession status

Provide:

- Semantic search
- Metadata filtering
- Recency-aware retrieval
- Importance-based ranking
- Contradiction handling
- Memory consolidation
- Retrieval context budgeting
- Explicit memory updates
- Memory deletion
- Memory export

Use pgvector for persistent cloud memory.

For local operation, use a compatible local database and embedding store.

Prefer free, locally computed embeddings when practical.

Do not send the entire conversation history to the LLM at every turn.

Do not store sensitive facts by default without appropriate consent.

Test that one user cannot access another user's memory.

## 8. AGENT AND TOOL ORCHESTRATION

Use LangGraph to implement the agent workflow.

The orchestration system must support:

- Intent classification where necessary
- Memory retrieval
- Tool selection
- Structured tool execution
- Sequential tool calls
- Parallel independent tool calls
- Error recovery
- State persistence
- Result verification
- Response generation
- Memory updates

Implement working tools for:

1. Memory management
2. Notes management
3. Task management
4. Reminder scheduling
5. Date and time
6. Deterministic calculations
7. Local document search through RAG

Optional future tools:

- Web search
- Calendar
- Email
- Weather
- MCP integrations

Never implement fake external actions.

Require user confirmation before destructive or externally consequential operations.

Every tool must have validated inputs and structured outputs.

Ensure tool execution remains secure in both anonymous and authenticated modes.

Make reminder scheduling durable and compatible with cloud restarts; do not depend exclusively on in-memory timers.

## 9. WINDOWS LOCAL DEVELOPMENT

Develop on Windows without assuming GPU availability.

First, inspect hardware programmatically where possible.

Determine:

- Windows version
- Python version
- RAM
- CPU
- Available GPU
- GPU vendor
- VRAM
- WSL2 availability
- Docker availability

Do not assume CUDA is installed.

Prefer WSL2 with Ubuntu for parity with Linux cloud deployments when beneficial.

Use:

- Python `uv`
- Node.js LTS
- pnpm
- Git
- VS Code-compatible tooling
- Docker Compose where supported

Provide PowerShell-compatible setup instructions.

Implement CPU-compatible model configurations by default.

Add optional NVIDIA CUDA acceleration only after detecting compatible hardware.

Use an automatic local model selection strategy based on available RAM, CPU and GPU.

If a model cannot operate efficiently on the detected hardware, choose a smaller supported model and document the tradeoff.

Fully local mode must support core conversations, functional tools and memory without paid APIs.

For multilingual TTS, document model sizes, download requirements and realistic CPU latency.

Cloud and local modes must reuse as much business logic as possible.

## 10. REAL-TIME PERFORMANCE

Build a genuine streaming voice experience.

Implement:

- WebRTC voice transport
- Voice activity detection
- Turn detection
- Streaming STT where supported
- Streaming LLM generation
- Incremental TTS where supported
- Barge-in interruption
- Cancellation of obsolete responses
- Responsive playback
- Network recovery
- Error handling

Measure:

- STT latency
- LLM time to first token
- Tool execution latency
- TTS time to first audio
- End-to-end latency
- Interruption response time
- Memory retrieval latency

Provide p50 and p95 metrics.

Do not claim sub-second response times without measured evidence.

Account for free-hosting cold starts.

Provide a clear "Connecting to voice agent" state and never disguise a cold start as LLM thinking.

## 11. UI/UX DESIGN

Design a premium AI application.

Visual requirements:

- Modern SaaS aesthetic
- Professional dark and light modes
- Clear visual hierarchy
- Responsive desktop and mobile layouts
- Fluid voice activity visualization
- Purposeful animations
- Accessible controls
- Beautiful typography
- Excellent empty, loading and error states

Create:

**Landing page**
- Product explanation
- Live demo CTA
- Architecture overview
- Major features
- Technology stack
- GitHub link
- Demo walkthrough

**Conversation page**
- Animated microphone visualization
- Listening/thinking/speaking states
- Live transcripts
- Voice interruption
- Text fallback
- Session timer
- Tool activity
- End session

**Memory dashboard**
- Memory categories
- Search
- Timeline
- Sources
- Edit
- Delete
- Export

**Conversation history**
- Session list
- Search
- Transcripts
- Session details

**Settings**
- Speech language
- Voice preferences
- LLM provider
- Memory preferences
- Privacy controls
- Theme

Do not prioritize visual effects over reliable voice functionality.

## 12. SECURITY AND COST PROTECTION

This is a publicly exposed AI application.

Implement:

- Short-lived LiveKit access tokens
- Server-side token signing
- Authenticated room assignment
- Secure session identity
- Strict CORS and origin handling
- Per-user authorization
- Rate limiting
- Demo abuse prevention
- Session concurrency limits
- Provider budget limits
- Safe tool execution
- Input validation
- Prompt injection defenses
- Secure secrets
- RLS
- Secure logging
- Data retention and deletion
- Dependency scanning

Never include privileged provider keys in browser code.

Do not rely solely on client-enforced session limits.

Avoid billable overages.

If a platform requires billing activation, verify whether spending can be strictly capped before recommending it.

Do not use signup credits as the only way to make the project function.

Implement accurate provider quota exhaustion detection.

When a limit is reached, return a clear user-facing message instead of repeatedly retrying requests.

## 13. CI/CD AND DEPLOYMENT

Use GitHub as the source of truth.

Create a deployment workflow that:

1. Runs formatting and linting.
2. Runs Python and TypeScript checks.
3. Executes unit and integration tests.
4. Runs security checks.
5. Builds the frontend.
6. Validates the agent container.
7. Deploys the frontend to Vercel.
8. Deploys the Python agent to LiveKit Cloud.
9. Runs post-deployment smoke tests.

Use GitHub Actions secrets or appropriate managed secrets for credentials.

Do not print secrets in pipeline logs.

Avoid unnecessary redeployments that consume limited free build quotas.

Document the entire deployment procedure.

Provide a working production URL after deployment succeeds.

If account authorization or dashboard interaction is required, stop at the relevant action and request only the necessary user input.

Do not invent deployments or claim a live URL exists before verifying it.

## 14. TESTING

Implement unit, integration, voice and end-to-end tests.

Cover:

- English conversation
- Hindi conversation
- Telugu conversation
- Code-switched conversation
- Interruptions
- Cross-session memory
- Memory correction
- Memory deletion
- Multi-tool tasks
- Quota exhaustion
- Provider downtime
- Browser permission rejection
- Cloud cold starts
- Unauthorized tool access
- Cross-user data isolation
- Mobile browser compatibility

Use simulated speech and recorded test utterances where appropriate.

Document test conditions and measurable results.

## 15. RECRUITER SHOWCASE

Treat the portfolio demo as a first-class product feature.

A first-time visitor should understand the project and start a conversation with minimal effort.

Include suggested prompts such as:

- "Hi, what can you do?"
- "Remember that I'm preparing for software engineering interviews."
- "What did I tell you earlier?"
- "Create a note and add a task for me."
- "Can we continue this conversation in Hindi?"
- "తెలుగులో మాట్లాడగలవా?" (Can you speak in Telugu?)

Use session-appropriate examples without exposing real personal data.

Provide a clear visual demonstration of memory retrieval and tool execution.

Add a short recorded backup demo for periods when the live agent is unavailable.

Produce an honest portfolio case study containing:

- Problem statement
- System architecture
- Technologies
- Engineering decisions
- Memory design
- Challenges
- Tests
- Actual latency measurements
- Deployment strategy
- GitHub link
- Live demo link

Generate ATS-friendly resume bullets only from implemented and verified functionality.

Never invent performance improvements.

## 16. REQUIRED IMPLEMENTATION PHASES

Phase 1: Research and validate technologies, quotas, language support and hosting feasibility.

Phase 2: Create repository, local environment and shared architecture.

Phase 3: Implement a complete English real-time voice conversation.

Phase 4: Add multilingual STT, LLM language routing and verified TTS.

Phase 5: Integrate LangGraph and functional tools.

Phase 6: Implement PostgreSQL, pgvector and persistent memory.

Phase 7: Build the complete Next.js UI and memory dashboard.

Phase 8: Add secure anonymous demo mode, authentication, quotas and abuse prevention.

Phase 9: Deploy the frontend, agent worker and persistent services.

Phase 10: Configure GitHub Actions and automated smoke tests.

Phase 11: Measure performance, optimize, audit security and test failure cases.

Phase 12: Create the portfolio case study, GitHub documentation and recruiter walkthrough.

Each phase must have explicit acceptance criteria.

Do not mark a phase complete without testing its main functionality.

## 17. DOUBLE-REVIEW REQUIREMENT

Before choosing a major component, review it twice.

First review:
- Performance
- Correctness
- Scalability
- Maintainability
- Developer experience

Second review:
- Actual free availability
- Deployment restrictions
- Hardware compatibility
- Language coverage
- Security
- License terms
- Operational reliability

Compare at least one credible alternative for important decisions.

If an initially preferred component is unsuitable, replace it.

Do not include technologies merely because they are popular.

## 18. DEFINITION OF DONE

The project is complete only when:

- The frontend is publicly accessible.
- The Python voice agent runs on hosted infrastructure.
- English conversations work.
- Hindi and Telugu voice flows have been tested.
- Voice interruptions work.
- Memory persists across authenticated sessions.
- RAG retrieval works.
- Multiple real tools work.
- Anonymous demo users are isolated.
- API keys are protected.
- Free-tier limits are enforced.
- Automated tests pass.
- GitHub Actions works.
- Local setup is documented.
- The README contains verified deployment information.
- The live demo has been smoke-tested.
- Measured performance metrics are documented.

If a requirement cannot be completed within free-tier restrictions, report it transparently and implement the best practical fallback.

Never fake success.

## 19. EXECUTION

Begin now.

1. Inspect the repository.
2. Verify current official technical documentation.
3. Present the architecture and hosting comparison.
4. Identify only essential missing information.
5. Create a detailed implementation plan.
6. Begin building the actual software.
7. Test and integrate each subsystem.
8. Deploy the public application.
9. Perform a second architecture and security review.
10. Deliver complete documentation, verified URLs and real metrics.

Do not stop after creating a plan unless an essential external authorization is required.

Think twice before every major architectural decision.

**The final deliverable must be a working, hosted, multilingual AI Voice Agent with Agentic Memory, not merely source code or a prototype.**