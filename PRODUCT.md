# Recall Voice Product Overview

## Platform
Web (Responsive desktop and mobile)

## Tech Stack
Next.js, TypeScript, Python, LiveKit, LangGraph, Supabase, and SQLite. Fully functional on standard CPU hardware for local offline operation.

## Target Users
Developers, users requiring inspectable persistent memory, and visitors exploring an interactive AI voice workspace.

## Product Purpose
Multilingual voice conversations with inspectable memory, real tool execution, and transparent state indicators. A user can converse naturally and directly observe what tools were run, what facts were memorized, and where data is stored.

## Capabilities and Constraints
- Priority languages: English, Hindi, and Telugu with automatic language detection.
- Zero mandatory cloud cost: full offline execution supported using Ollama and local SQLite storage.
- Multi-tenant security: anonymous demo sessions expire automatically and remain isolated. Persistent memory requires explicit user authentication and consent.
- Honest state indicators: never simulates a connection or fabricates synthetic live results.

## Product Principles
1. **Connection Truth**: Always show real backend connection and model status.
2. **Inspectable Memory**: Keep memory entries transparent, searchable, editable, and deletable by the user.
3. **Preserve Original Language**: Respond in the user's spoken language without forced translation.
4. **Fail Closed**: Strictly enforce quotas, rate limits, and authorization boundaries.
5. **Functional Clarity**: Prioritize clear, accessible SaaS interactions over gratuitous visual effects.
