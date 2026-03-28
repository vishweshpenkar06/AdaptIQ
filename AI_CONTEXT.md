# AdaptIQ - AI Context (Short)

## What this project is
- AdaptIQ is a Next.js 16 learning platform that finds root causes behind student mistakes using concept dependencies.
- Core idea: diagnose why answers are wrong, not just whether they are wrong.

## Stack
- Framework: Next.js App Router
- Auth + DB: Supabase (Postgres + RLS)
- UI: Tailwind CSS v4 + shadcn/ui
- Charts: Recharts
- Icons: Lucide

## Main routes
- Public: /landing, /auth/login, /auth/sign-up, /auth/sign-up-success, /auth/error
- Protected: / (dashboard), /practice, /knowledge-map, /progress, /recovery
- Added app routes: /profile, /settings

## Auth and route protection
- Uses [proxy.ts](proxy.ts) (Next.js 16 convention) for session refresh + route guard.
- Redirect logic:
  - Unauthenticated user on protected route -> /landing
  - Authenticated user on /auth/* -> /
- Supabase helpers:
  - Browser client: [lib/supabase/client.ts](lib/supabase/client.ts)
  - Server client: [lib/supabase/server.ts](lib/supabase/server.ts)
  - Proxy/session logic: [lib/supabase/middleware.ts](lib/supabase/middleware.ts)

## Key UI components
- [components/navbar.tsx](components/navbar.tsx): auth-aware nav, profile menu, sign out
- [components/question-card.tsx](components/question-card.tsx): practice question UI and answer submission payload
- [components/diagnosis-panel.tsx](components/diagnosis-panel.tsx): root-cause feedback
- [components/knowledge-graph.tsx](components/knowledge-graph.tsx): SVG dependency graph
- [components/ai-chat-panel.tsx](components/ai-chat-panel.tsx): Groq-backed AI tutor chat via [app/api/chat/route.ts](app/api/chat/route.ts) using model openai/gpt-oss-120b
- [components/realtime-page-refresh.tsx](components/realtime-page-refresh.tsx): throttled realtime-driven router refresh helper
- Global toasts mounted in [app/layout.tsx](app/layout.tsx#L55)

## Data model (important tables)
- Content: subjects, concepts, concept_dependencies, questions
- User data: profiles, user_concept_mastery, practice_sessions, question_attempts, learning_paths, learning_path_items, hindsight_events, chat_messages
- RLS is expected to enforce per-user access for user tables.

## Learning logic (mental model)
- Questions map to concepts.
- Wrong answers trigger diagnosis of missing prerequisites.
- Mastery is tracked per concept (0..1), mapped to statuses (not_started, weak, developing, mastered).
- Recovery paths are stored in `learning_paths` and tracked per-step in `learning_path_items`.
- Recovery sidebar can render checkmarks and completed count using `completed_at`.

## Current status / implementation notes
- Dashboard, practice, knowledge-map, and progress are DB-backed via Supabase:
  - [app/page.tsx](app/page.tsx)
  - [app/practice/page.tsx](app/practice/page.tsx)
  - [app/knowledge-map/page.tsx](app/knowledge-map/page.tsx)
  - [app/progress/page.tsx](app/progress/page.tsx)
- Practice flow persists data:
  - Inserts question attempts
  - Tracks/updates practice sessions
  - Upserts user concept mastery
- Practice question ordering is now freshness-aware:
  - weak/missing concepts are prioritized when no concept filter is provided
  - unseen/least-recently-attempted questions are preferred before repeats
- Recovery step questions are now freshness-aware per user rather than fixed oldest-first selection.
- Realtime update behavior is present with throttling to avoid refresh storms.
- AI assistant backend is live via [app/api/chat/route.ts](app/api/chat/route.ts) using Groq model `openai/gpt-oss-120b`.
- Grounded AI modules are implemented:
  - [lib/ai/context-builder.ts](lib/ai/context-builder.ts): builds structured context from concept graph, mastery, hindsight, question, and student level.
  - [lib/ai/prompts.ts](lib/ai/prompts.ts): explanation/diagnosis/recovery/pattern prompt templates with strict short-response guardrails.
  - [lib/ai/service.ts](lib/ai/service.ts): centralized model call wrapper with low temperature, timeout handling, sentence clamp, and in-memory TTL cache.
- Grounded AI is integrated additively into APIs:
  - [app/api/diagnosis/route.ts](app/api/diagnosis/route.ts): returns `ai_explanation` (non-blocking fallback).
  - [app/api/recovery/route.ts](app/api/recovery/route.ts): returns grounded `explanation` + optional `ai_explanation`.
  - [app/api/hindsight/route.ts](app/api/hindsight/route.ts): returns optional `pattern_insight`.
  - [app/api/ai/explain/route.ts](app/api/ai/explain/route.ts): dedicated explain endpoint for question/concept-grounded responses.
- True Hindsight SDK integration is now wired server-side in hybrid mode:
  - Client wrapper: [lib/hindsight/client.ts](lib/hindsight/client.ts)
  - Config helper: [lib/hindsight/config.ts](lib/hindsight/config.ts)
  - Dual-write retain from local event writes: [lib/hindsight/service.ts](lib/hindsight/service.ts)
  - Optional recall enrichment in path scoring: [lib/learning-path/generator.ts](lib/learning-path/generator.ts)
  - Optional reflect hint on recovery PATCH: [app/api/recovery/route.ts](app/api/recovery/route.ts)
  - Feature flags: `HINDSIGHT_ENABLED`, `HINDSIGHT_RECALL_ENRICHMENT_ENABLED`, `HINDSIGHT_REFLECT_ON_RECOVERY`
  - Optional fixed bank pinning: `HINDSIGHT_BANK_ID` (overrides namespace+user id bank naming)
- Design system is token-based in [app/globals.css](app/globals.css).

## Conventions for edits
- Prefer server components for reads and server actions for mutations where possible.
- Keep Supabase queries RLS-compatible.
- Reuse existing shadcn/ui components and established Tailwind patterns.
- Preserve route intent: landing/auth public, app pages protected.

## Useful commands
- Dev: pnpm dev (or npm run dev in this repo)
- Build: pnpm build
- Type/lint: pnpm type-check, pnpm lint
- Question-bank top-up script: run `scripts/005_expand_question_bank.sql` in Supabase SQL editor to ensure each concept has at least 8 questions.
- Hindsight debug status/probe: use `/api/hindsight/debug` (GET for config/bank info, POST for retain+recall probe).
- Hindsight mastery sync: use `/api/hindsight/sync-mastery` (or Settings button) to sync per-concept accuracy snapshots.