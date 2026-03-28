# AdaptIQ

**An intelligent learning system that diagnoses *why* students fail by analyzing concept dependencies and provides personalized learning paths using visual knowledge graphs and AI assistance.**

> Stop wondering why you got it wrong. Start understanding why.

---

## Vision

Move from:
> "You got this wrong"

To:
> "You got this wrong because you missed concept X, which depends on Y"

AdaptIQ is not just another quiz platform. It's a **structured diagnostic system** that understands how knowledge connects and identifies exactly where your learning breaks down.

---

## Live Demo

- **Landing Page**: `/landing` - Product overview and value proposition
- **Dashboard**: `/` - Your learning hub with progress stats
- **Practice**: `/practice` - Answer questions and get diagnosed
- **Recovery**: `/recovery` - Follow personalized prerequisite recovery steps
- **Knowledge Map**: `/knowledge-map` - Visual concept dependency graph
- **Progress**: `/progress` - Track your learning journey

---

## Core Features

### 1. Concept Graph Engine
A predefined structured knowledge graph where:
- **Nodes** represent concepts (e.g., Force, Mass, Acceleration)
- **Edges** represent dependencies/prerequisites
- Visual status indicators: Green (mastered), Yellow (weak), Red (missing)

### 2. Practice System
- Questions fetched from Supabase (`questions`) with difficulty mapping (easy, medium, hard)
- Questions linked to concepts via `concept_id`
- Weak-first concept prioritization when practicing without a fixed concept filter
- Question rotation that prefers unseen/least-recently-attempted questions before repeating
- Instant feedback with detailed explanations
- Root cause analysis for incorrect answers
- Answer persistence to database (`question_attempts`)
- Session tracking (`practice_sessions`)
- Mastery updates per concept (`user_concept_mastery`)

### 3. Diagnosis Engine (Core Innovation)
When a student answers incorrectly:
1. Maps the error to specific concepts
2. Traces prerequisite chain (1-2 levels deep)
3. Identifies missing concepts and probable root causes
4. Suggests personalized learning paths

### 4. Visual Knowledge Map
- Interactive graph visualization using SVG
- Pan/zoom controls for exploration
- Click nodes for concept details
- Visual dependency highlighting on hover
- Color-coded progress indicators

### 5. AI Study Companion
- Context-aware chat assistant
- Explains concepts and mistakes
- Suggests what to study next
- Quick action buttons for common queries
- Grounded AI context pipeline (`lib/ai/context-builder.ts`) for concept/dependency/mastery/mistake-aware prompts
- Prompt strategy module (`lib/ai/prompts.ts`) with concise, guardrailed templates
- Shared AI service (`lib/ai/service.ts`) with low-temperature generation, timeout safety, sentence limits, and TTL cache
- Additive grounded outputs in APIs: diagnosis (`ai_explanation`), recovery (`ai_explanation`), hindsight summary (`pattern_insight`)

### 6. Progress Tracking
- Accuracy metrics over time from real attempts
- Concept mastery breakdown (pie chart)
- Individual concept progress bars
- Learning insights derived from user progress data

### 7. Hindsight + Recovery Path
- Logs mistake events to build a hindsight trail (`hindsight_events`)
- Generates deterministic learning paths with prerequisite ordering
- Tracks step completion in `learning_path_items.completed_at`
- Recovery sidebar shows per-step done checkmarks and subtle `Completed X/Y` progress
- Recovery question selection prefers unseen/least-recent concept questions for the current user
- Auto-marks learning path status as `completed` when all steps finish
- Settings includes a manual sync action to push per-concept mastery snapshots into Hindsight

### 8. Auth + Realtime UX
- Supabase email/password authentication
- Route protection through Next.js `proxy.ts`
- Public routes: `/landing`, `/auth/*`
- Protected routes: `/`, `/practice`, `/knowledge-map`, `/progress`, `/recovery`
- Realtime-triggered dashboard/progress refresh (throttled)
- Optimistic UI + error/success toasts for practice writes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Auth | Supabase Auth |
| Database | Supabase Postgres + RLS |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Graph Visualization | Custom SVG-based component |
| Typography | Plus Jakarta Sans |
| Icons | Lucide React |

---

## Project Structure

```
adaptiq/
├── app/
│   ├── layout.tsx          # Root layout with fonts and metadata
│   ├── page.tsx             # Dashboard (DB-backed)
│   ├── globals.css          # Design system tokens
│   ├── landing/
│   │   └── page.tsx         # Marketing landing page
│   ├── practice/
│   │   └── page.tsx         # Practice with DB writes + mastery updates
│   ├── knowledge-map/
│   │   └── page.tsx         # Interactive knowledge graph (DB-backed)
│   └── progress/
│       └── page.tsx         # Progress charts from live DB data
├── proxy.ts                 # Route/session guard entrypoint (Next.js 16)
├── components/
│   ├── navbar.tsx           # Navigation component
│   ├── stat-card.tsx        # Statistics display card
│   ├── concept-card.tsx     # Concept information card
│   ├── concept-badge.tsx    # Status badge (mastered/weak/missing)
│   ├── question-card.tsx    # MCQ question component
│   ├── diagnosis-panel.tsx  # Root cause analysis display
│   ├── ai-chat-panel.tsx    # AI assistant chat interface
│   ├── knowledge-graph.tsx  # SVG-based graph visualization
│   └── realtime-page-refresh.tsx # Throttled realtime router refresh helper
├── lib/
│   ├── types.ts             # TypeScript type definitions
│   ├── data.ts              # Legacy mock data (partially retained)
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   ├── server.ts        # Server Supabase client
│   │   └── middleware.ts    # Session update utility
│   └── utils.ts             # Helper utilities
└── README.md
```

---

## Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#2563EB` | Intelligent blue - main actions |
| Secondary | `#38BDF8` | Light blue highlights |
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards and surfaces |
| Success | `#22C55E` | Mastered concepts |
| Warning | `#F59E0B` | Weak concepts |
| Danger | `#EF4444` | Missing concepts |
| Text Primary | `#0F172A` | Main text |
| Text Muted | `#64748B` | Secondary text |
| Border | `#E2E8F0` | Borders and dividers |

### Typography
- **Font**: Plus Jakarta Sans (fallback: Inter, sans-serif)
- **H1**: 40-48px, weight 700
- **H2**: 28-32px, weight 600
- **H3**: 20-24px, weight 600
- **Body**: 16px, weight 400-500
- **Caption**: 12-14px, weight 400

### Spacing
- Gap system: 8px base scale (8 / 12 / 16 / 24 / 32)
- Card padding: 20-24px
- Section padding: 64-96px
- Max width: 1200px (dashboard), 1400px (graph view)

### Border Radius
- Cards: 16px
- Buttons: 10px
- Inputs: 8px

---

## Data Model

### Entities

```typescript
// Core domain types
interface Concept {
  id: string;
  name: string;
  subject: string;
  chapter: string;
  description: string;
  status?: 'mastered' | 'weak' | 'missing';
  accuracy?: number;
}

interface ConceptDependency {
  id: string;
  parentConceptId: string;
  childConceptId: string;
}

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  conceptIds: string[];
}

interface UserConceptProgress {
  id: string;
  userId: string;
  conceptId: string;
  accuracy: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}
```

---

## User Interaction Flow

### Dashboard
1. View progress summary and stats
2. See weak concepts that need attention
3. Get suggested next topic
4. Start practice session

### Practice Session
1. Answer MCQ questions
2. Get instant feedback
3. View explanations for correct answers
4. See root cause analysis for incorrect answers
5. Get AI-powered assistance (chat + grounded explain endpoint)
6. View session summary on completion

### Knowledge Map
1. Explore concept graph visually
2. Click nodes to see details
3. View prerequisites and dependents
4. Navigate to practice for specific concepts
5. Switch between graph and list views

### Progress
1. View accuracy trends over time
2. See mastery distribution
3. Review individual concept progress
4. Get personalized learning insights

---

## Development Phases

### Phase 1: Foundation (Current MVP)
- [x] Project setup with Next.js
- [x] Design system implementation
- [x] Core UI components
- [x] Initial mock data for Physics chapter
- [x] Basic navigation

### Phase 2: Practice System
- [x] Question card component
- [x] Answer submission flow
- [x] Feedback display
- [x] Explanation rendering
- [x] Persist attempts and sessions to DB
- [x] Update concept mastery on answer submit

### Phase 3: Diagnosis Engine
- [x] Error to concept mapping
- [x] Prerequisite chain tracing
- [x] Root cause panel
- [x] Suggested path display

### Phase 4: Knowledge Graph
- [x] SVG-based visualization
- [x] Node color coding
- [x] Interactive pan/zoom
- [x] Concept detail panel

### Phase 5: AI Integration
- [x] Chat panel UI
- [x] Quick action buttons
- [x] Context-aware suggestions
- [ ] Real AI API integration

### Phase 6: Progress Tracking
- [x] Accuracy charts from DB attempts
- [x] Concept breakdown
- [x] Learning insights
- [x] Trend visualization

### Phase 7: Data + Auth
- [x] Supabase authentication
- [x] Protected route handling with `proxy.ts`
- [x] DB-backed Dashboard / Practice / Knowledge Map / Progress
- [x] Realtime refresh for Dashboard and Progress
- [x] Optimistic UX and toasts for practice persistence

---

## Future Roadmap

- [ ] Full realtime subscriptions across all pages
- [ ] Multi-subject support
- [ ] Full syllabus coverage
- [ ] Adaptive learning paths
- [ ] AI-generated questions
- [ ] Spaced repetition engine
- [ ] Mobile app
- [ ] Teacher dashboard
- [ ] Student collaboration features

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd adaptive-learning-system-main

# Install dependencies
npm install

# Create env file
cp .env.example .env.local

# Start development server
npm run dev

# Optional: expand questions so every concept has at least 8 checks
# (safe to rerun; only fills missing coverage)
# Run this in Supabase SQL editor: scripts/005_expand_question_bank.sql
```

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=

# True Hindsight integration (server-side)
HINDSIGHT_ENABLED=false
HINDSIGHT_API_BASE_URL=
HINDSIGHT_API_KEY=
HINDSIGHT_BANK_NAMESPACE=adaptiq_
HINDSIGHT_BANK_ID=
HINDSIGHT_RECALL_ENRICHMENT_ENABLED=false
HINDSIGHT_REFLECT_ON_RECOVERY=false
```

Grounded AI module notes:
- `lib/ai/context-builder.ts` composes structured context from concepts, dependencies, mastery, hindsight, and optional question text.
- `lib/ai/prompts.ts` contains reusable explanation/diagnosis/recovery/pattern prompt builders.
- `lib/ai/service.ts` handles model calls with guardrails and short-lived response caching.

Grounded AI API routes:
- `POST /api/ai/explain` -> returns grounded explanation for a `question_id` or `concept_id`.
- `POST /api/diagnosis` -> now includes optional `ai_explanation`.
- `POST /api/recovery` -> now includes optional `ai_explanation` and grounded explanation fallback.
- `GET /api/hindsight` -> now includes optional `pattern_insight`.

Hindsight defaults to a safe hybrid mode:
- Local `hindsight_events` stays authoritative for app behavior.
- When enabled and configured, the app dual-writes retain events to Hindsight.
- Recall enrichment and reflect guidance are both optional and feature-flagged.

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Target Audience

- **Primary**: Class 9-10 students (Science)
- **Focus**: Students struggling with:
  - Concept clarity
  - Weak fundamentals
  - Fragmented knowledge

---

## MVP Scope

- One subject: Physics
- One chapter: Force & Laws of Motion
- Pre-built concept graph with 10 concepts
- Curated question bank (8+ questions)
- Basic diagnosis with 1-2 level dependency tracing

---

## Key Differentiator

This product is NOT:
> "Just practice questions + AI"

This product IS:
> **A structured system that understands knowledge and student learning gaps**

The core innovation lies in the **Diagnosis Engine** that traces concept dependencies to identify the root cause of learning difficulties, providing actionable insights rather than just right/wrong feedback.

---

## License

MIT

---

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.
