# AdaptIQ - Technical Documentation

> Comprehensive documentation for the AdaptIQ intelligent learning system. This document is designed to help developers (and AI assistants like GitHub Copilot) understand the project architecture, implemented features, and how components interconnect.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [Core Features](#core-features)
6. [Component Reference](#component-reference)
7. [Page Reference](#page-reference)
8. [Data Flow](#data-flow)
9. [API Patterns](#api-patterns)
10. [Design System](#design-system)
11. [Development Guidelines](#development-guidelines)

---

## Project Overview

### What is AdaptIQ?

AdaptIQ is an intelligent learning system that diagnoses **why** students fail by analyzing concept dependencies. Unlike traditional quiz platforms that only show right/wrong answers, AdaptIQ:

1. Maps student errors to specific concepts
2. Traces prerequisite chains to find root causes
3. Visualizes knowledge gaps on an interactive graph
4. Provides AI-powered personalized learning paths

### Core Innovation

The **Diagnosis Engine** transforms feedback from:
> "You got this wrong"

To:
> "You got this wrong because you missed [Concept X], which depends on [Concept Y]. Start by reviewing [Y] first."

### Target Audience

- **Primary**: Class 9-10 students (India CBSE curriculum)
- **Focus**: Students struggling with concept clarity and fragmented knowledge
- **Subjects**: Mathematics and Science (Physics, Chemistry, Biology)

---

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| Database | Supabase (PostgreSQL) | Data persistence with RLS |
| Auth | Supabase Auth | Email/password authentication |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Components | shadcn/ui | Pre-built accessible components |
| Charts | Recharts | Data visualization |
| Icons | Lucide React | Icon library |
| Typography | Plus Jakarta Sans | Primary font |

### Directory Structure

```
adaptiq/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Dashboard (protected)
│   ├── globals.css               # Design tokens & Tailwind config
│   ├── auth/                     # Authentication pages
│   │   ├── login/page.tsx        # Login form
│   │   ├── sign-up/page.tsx      # Registration form
│   │   ├── sign-up-success/page.tsx
│   │   └── error/page.tsx
│   ├── landing/page.tsx          # Public marketing page
│   ├── practice/page.tsx         # Practice session (protected)
│   ├── knowledge-map/page.tsx    # Knowledge graph (protected)
│   └── progress/page.tsx         # Progress tracking (protected)
│
├── components/                   # Reusable UI components
│   ├── navbar.tsx                # Navigation with auth state
│   ├── stat-card.tsx             # Statistics display card
│   ├── concept-card.tsx          # Concept info card
│   ├── concept-badge.tsx         # Status badge (mastered/weak/missing)
│   ├── question-card.tsx         # MCQ question with answer handling
│   ├── diagnosis-panel.tsx       # Root cause analysis display
│   ├── ai-chat-panel.tsx         # AI assistant interface
│   ├── knowledge-graph.tsx       # SVG-based graph visualization
│   └── theme-provider.tsx        # Theme context provider
│
├── lib/                          # Utilities and configuration
│   ├── types.ts                  # TypeScript type definitions
│   ├── data.ts                   # Mock data (to be replaced with DB)
│   ├── utils.ts                  # Helper functions (cn, etc.)
│   └── supabase/                 # Supabase client configuration
│       ├── client.ts             # Browser client (singleton)
│       ├── server.ts             # Server client (per-request)
│       └── middleware.ts         # Session refresh logic
│
├── middleware.ts                 # Route protection middleware
│
└── scripts/                      # Database migrations (executed)
    ├── 001_create_schema.sql     # Tables and constraints
    ├── 002_profile_trigger.sql   # Auto-create profile on signup
    └── 003_seed_data.sql         # Sample educational content
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐
│   auth.users    │     │    profiles     │
│   (Supabase)    │────>│   id (FK)       │
│                 │     │   first_name    │
│                 │     │   last_name     │
│                 │     │   grade         │
│                 │     │   avatar_url    │
└─────────────────┘     └─────────────────┘
         │
         │ user_id references
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      USER DATA TABLES                        │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ user_concept_    │  │ practice_        │                 │
│  │ mastery          │  │ sessions         │                 │
│  │ - mastery_level  │  │ - started_at     │                 │
│  │ - status         │  │ - total_questions│                 │
│  │ - attempts       │  │ - correct_answers│                 │
│  └──────────────────┘  └──────────────────┘                 │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ learning_paths   │  │ question_attempts│                 │
│  │ - priority       │  │ - selected_answer│                 │
│  │ - reason         │  │ - is_correct     │                 │
│  │ - is_completed   │  │ - time_spent     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐                                       │
│  │ chat_messages    │                                       │
│  │ - role           │                                       │
│  │ - content        │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   EDUCATIONAL CONTENT TABLES                 │
│  ┌──────────────────┐                                       │
│  │    subjects      │                                       │
│  │ - name           │                                       │
│  │ - description    │                                       │
│  │ - icon, color    │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐     ┌──────────────────┐             │
│  │    concepts      │────>│ concept_         │             │
│  │ - name           │     │ dependencies     │             │
│  │ - description    │<────│ - prerequisite_id│             │
│  │ - difficulty     │     │ - strength       │             │
│  └────────┬─────────┘     └──────────────────┘             │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │    questions     │                                       │
│  │ - question_text  │                                       │
│  │ - options (JSONB)│                                       │
│  │ - correct_answer │                                       │
│  │ - explanation    │                                       │
│  │ - difficulty     │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Tables Reference

| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `profiles` | User profile data (extends auth.users) | Own data only |
| `subjects` | Subject categories (Math, Science) | Read: all authenticated |
| `concepts` | Knowledge graph nodes | Read: all authenticated |
| `concept_dependencies` | Knowledge graph edges (prerequisites) | Read: all authenticated |
| `questions` | Question bank with MCQ/TF types | Read: all authenticated |
| `user_concept_mastery` | Per-user concept progress | Own data only |
| `practice_sessions` | Practice session records | Own data only |
| `question_attempts` | Individual answer logs | Own data only |
| `chat_messages` | AI chat history | Own data only |
| `learning_paths` | Recommended learning paths | Own data only |

### Key Constraints

- `user_concept_mastery`: `mastery_level` between 0 and 1
- `user_concept_mastery`: `status` enum: `not_started`, `weak`, `developing`, `mastered`
- `questions`: `question_type` enum: `mcq`, `true_false`, `fill_blank`
- `questions`: `difficulty` between 1 and 5
- `concept_dependencies`: `strength` between 0 and 1

---

## Authentication System

### Flow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────>│   Sign Up   │────>│   Confirm   │
│    Page     │     │    Form     │     │    Email    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐            │
       └───────────>│    Login    │<───────────┘
                    │    Form     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Dashboard  │
                    │ (Protected) │
                    └─────────────┘
```

### Implementation Details

**Middleware** (`middleware.ts` + `lib/supabase/middleware.ts`):
- Refreshes session tokens on every request
- Protects routes: redirects unauthenticated users to `/landing`
- Public routes: `/landing`, `/auth/*`
- Redirects authenticated users away from auth pages

**Supabase Clients**:
- `lib/supabase/client.ts`: Browser client (singleton pattern)
- `lib/supabase/server.ts`: Server client (per-request, uses cookies)

**Profile Auto-Creation**:
- Database trigger `handle_new_user()` creates profile on signup
- Captures `first_name` and `last_name` from signup metadata

### Auth Pages

| Route | Purpose | Components Used |
|-------|---------|-----------------|
| `/auth/login` | Email/password login | Card, Input, Button, Label |
| `/auth/sign-up` | Registration with name | Card, Input, Button, Label |
| `/auth/sign-up-success` | Email confirmation notice | Card, Mail icon |
| `/auth/error` | Auth error display | Card, AlertCircle icon |

---

## Core Features

### 1. Concept Graph Engine

**Purpose**: Represents knowledge as a directed acyclic graph where concepts have prerequisites.

**Implementation**:
- Concepts stored in `concepts` table with subject reference
- Dependencies in `concept_dependencies` with strength (0-1)
- Status derived from `user_concept_mastery` per user

**Status Logic**:
```typescript
// Derived from mastery_level
if (mastery_level >= 0.8) status = 'mastered'   // Green
else if (mastery_level >= 0.5) status = 'weak'  // Yellow  
else status = 'missing'                          // Red
```

### 2. Practice System

**Purpose**: Delivers questions, captures answers, provides feedback.

**Components**:
- `question-card.tsx`: Renders MCQ with option selection
- `diagnosis-panel.tsx`: Shows root cause when wrong

**Question Flow**:
1. Fetch questions for selected concept(s)
2. User selects answer
3. Validate against `correct_answer`
4. If wrong: trigger diagnosis engine
5. Update `user_concept_mastery` accordingly

### 3. Diagnosis Engine

**Purpose**: When a student fails, identify the root cause by tracing prerequisites.

**Algorithm**:
```typescript
function diagnose(failedConceptId: string, userId: string): DiagnosisResult {
  // 1. Get the concept that was failed
  const concept = getConcept(failedConceptId)
  
  // 2. Get prerequisites (1-2 levels deep)
  const prerequisites = getPrerequisites(failedConceptId, depth=2)
  
  // 3. Check user's mastery of each prerequisite
  const weakPrereqs = prerequisites.filter(p => 
    getUserMastery(userId, p.id).status !== 'mastered'
  )
  
  // 4. Find the deepest weak prerequisite (root cause)
  const rootCause = findDeepestWeak(weakPrereqs)
  
  // 5. Build suggested learning path
  const path = buildPath(rootCause, failedConceptId)
  
  return { rootCause, dependencyChain: path, suggestedPath: path }
}
```

### 4. Visual Knowledge Map

**Purpose**: Interactive graph visualization of concept dependencies.

**Implementation** (`knowledge-graph.tsx`):
- Pure SVG rendering (no external graph library)
- Nodes positioned using force-directed layout (pre-computed)
- Edges drawn as curved paths with arrows
- Pan/zoom via mouse drag and wheel
- Click handlers for node selection

**Features**:
- Color-coded nodes by status
- Hover highlights related concepts
- Sidebar shows concept details
- Filter by subject

### 5. AI Study Companion

**Purpose**: Context-aware chat assistant for learning support.

**Implementation** (`ai-chat-panel.tsx`):
- Chat interface with message history
- Quick action buttons for common queries
- Context: current concept, recent mistakes
- Messages stored in `chat_messages` table

**Quick Actions**:
- "Explain this concept"
- "Why did I get it wrong?"
- "What should I study next?"
- "Give me a hint"

**Note**: Currently uses mock responses. Ready for AI SDK integration.

### 6. Progress Tracking

**Purpose**: Visualize learning progress over time.

**Implementation** (`progress/page.tsx`):
- Accuracy trend line chart (Recharts)
- Concept mastery pie chart
- Individual concept progress bars
- Learning insights cards

**Data Sources**:
- `user_concept_mastery`: Current mastery levels
- `question_attempts`: Historical accuracy
- `practice_sessions`: Session summaries

---

## Component Reference

### Core Components

#### `navbar.tsx`
Navigation bar with auth-aware state.

**Props**: None (uses Supabase client internally)

**Features**:
- Logo with brand name
- Navigation links (conditionally shown when authenticated)
- Mobile menu
- Sign in/out buttons
- User avatar when authenticated

**Usage**:
```tsx
<Navbar />
```

---

#### `stat-card.tsx`
Statistics display with icon and trend indicator.

**Props**:
```typescript
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}
```

**Usage**:
```tsx
<StatCard 
  title="Accuracy" 
  value="78%" 
  icon={Target}
  trend="up"
  trendValue="+5%"
/>
```

---

#### `concept-badge.tsx`
Status badge for concept mastery.

**Props**:
```typescript
interface ConceptBadgeProps {
  status: 'mastered' | 'weak' | 'missing'
  showLabel?: boolean
}
```

**Color Mapping**:
- `mastered`: Green (`bg-success`)
- `weak`: Yellow (`bg-warning`)
- `missing`: Red (`bg-destructive`)

---

#### `concept-card.tsx`
Displays concept information with status.

**Props**:
```typescript
interface ConceptCardProps {
  concept: Concept
  onClick?: () => void
  selected?: boolean
}
```

---

#### `question-card.tsx`
MCQ question with answer submission.

**Props**:
```typescript
interface QuestionCardProps {
  question: Question
  onAnswer: (answer: string, isCorrect: boolean) => void
  showExplanation?: boolean
}
```

**State**:
- Selected option
- Submitted state
- Correct/incorrect feedback

---

#### `diagnosis-panel.tsx`
Root cause analysis display.

**Props**:
```typescript
interface DiagnosisPanelProps {
  diagnosis: DiagnosisResult
  onStartPath?: () => void
}
```

**Displays**:
- Missing concept
- Dependency chain visualization
- Root cause explanation
- Suggested learning path

---

#### `ai-chat-panel.tsx`
AI assistant chat interface.

**Props**:
```typescript
interface AIChatPanelProps {
  conceptContext?: Concept
  onClose?: () => void
}
```

**Features**:
- Message list with user/assistant styling
- Input field with send button
- Quick action chips
- Typing indicator

---

#### `knowledge-graph.tsx`
SVG-based knowledge graph visualization.

**Props**:
```typescript
interface KnowledgeGraphProps {
  concepts: Concept[]
  dependencies: ConceptDependency[]
  userProgress?: UserConceptProgress[]
  onNodeClick?: (conceptId: string) => void
  selectedConceptId?: string
}
```

**Features**:
- SVG rendering with viewBox
- Pan: mouse drag
- Zoom: mouse wheel
- Node selection
- Edge highlighting

---

## Page Reference

### Public Pages

#### `/landing`
Marketing landing page introducing AdaptIQ.

**Sections**:
1. Hero with headline and CTAs
2. Features grid (4 cards)
3. How it works (3 steps)
4. Benefits with AI chat preview
5. Testimonials (3 cards)
6. Stats bar
7. Final CTA

---

### Protected Pages

#### `/` (Dashboard)
Main hub showing progress summary.

**Sections**:
- Welcome message with user name
- Stats row (mastery %, concepts, streak, time)
- Weak concepts grid
- Suggested next topic
- Recent activity

---

#### `/practice`
Practice session with questions.

**Layout**: Two-column (desktop)
- Left: Question card
- Right: Diagnosis panel / AI chat

**State**:
- Current question index
- Session progress
- Diagnosis results

---

#### `/knowledge-map`
Interactive concept graph.

**Layout**: Full-width graph with sidebar

**Features**:
- Subject filter
- View toggle (graph/list)
- Concept detail panel
- Zoom controls

---

#### `/progress`
Progress tracking and insights.

**Sections**:
- Accuracy over time (line chart)
- Concept mastery (pie chart)
- Individual concept bars
- Learning insights cards

---

## Data Flow

### Practice Session Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      PRACTICE SESSION                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Start Session   │
│ (Create record) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Fetch Questions │────>│ Display Question│
│ (by concept)    │     │ (QuestionCard)  │
└─────────────────┘     └────────┬────────┘
                                 │
                        User selects answer
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Submit Answer   │
                        └────────┬────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                      │
              ▼                                      ▼
     ┌─────────────────┐                  ┌─────────────────┐
     │    Correct!     │                  │   Incorrect!    │
     │ Update mastery  │                  │ Trigger diagnosis│
     │ (+confidence)   │                  │ Show root cause │
     └─────────────────┘                  └─────────────────┘
              │                                      │
              └──────────────────┬───────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Next Question   │
                        │ or End Session  │
                        └─────────────────┘
```

### Mastery Update Logic

```typescript
async function updateMastery(
  userId: string, 
  conceptId: string, 
  isCorrect: boolean
) {
  const current = await getMastery(userId, conceptId)
  
  // Update attempts
  const attempts = current.attempts + 1
  const correctAttempts = current.correct_attempts + (isCorrect ? 1 : 0)
  
  // Calculate new mastery (weighted average)
  const newMastery = correctAttempts / attempts
  
  // Determine status
  let status: ConceptStatus
  if (newMastery >= 0.8) status = 'mastered'
  else if (newMastery >= 0.5) status = 'developing'
  else if (attempts > 0) status = 'weak'
  else status = 'not_started'
  
  await updateUserConceptMastery(userId, conceptId, {
    mastery_level: newMastery,
    status,
    attempts,
    correct_attempts: correctAttempts,
    last_practiced_at: new Date()
  })
}
```

---

## API Patterns

### Server Actions (Recommended)

For data mutations, use Next.js Server Actions:

```typescript
// app/actions/practice.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitAnswer(
  questionId: string,
  selectedAnswer: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // Get question to check answer
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single()
  
  const isCorrect = question.correct_answer === selectedAnswer
  
  // Record attempt
  await supabase.from('question_attempts').insert({
    question_id: questionId,
    user_id: user.id,
    selected_answer: selectedAnswer,
    is_correct: isCorrect
  })
  
  // Update mastery
  await updateConceptMastery(user.id, question.concept_id, isCorrect)
  
  return { isCorrect, explanation: question.explanation }
}
```

### Data Fetching (RSC)

For read operations, fetch in React Server Components:

```typescript
// app/practice/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function PracticePage() {
  const supabase = await createClient()
  
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      *,
      concept:concepts(*)
    `)
    .limit(10)
  
  return <PracticeSession questions={questions} />
}
```

### Client-Side Fetching (SWR)

For real-time or frequently updating data:

```typescript
// components/progress-chart.tsx
'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

export function ProgressChart() {
  const { data, error, isLoading } = useSWR('user-progress', async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_concept_mastery')
      .select('*, concept:concepts(*)')
    return data
  })
  
  if (isLoading) return <Skeleton />
  return <Chart data={data} />
}
```

---

## Design System

### Color Tokens

```css
/* globals.css */
:root {
  /* Primary - Intelligent Blue */
  --primary: #2563EB;
  --primary-foreground: #FFFFFF;
  
  /* Secondary - Light Blue */
  --secondary: #38BDF8;
  
  /* Semantic Status */
  --success: #22C55E;      /* Mastered */
  --warning: #F59E0B;      /* Weak */
  --destructive: #EF4444;  /* Missing */
  
  /* Neutrals */
  --background: #F8FAFC;
  --foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --border: #E2E8F0;
}
```

### Typography

```css
@theme inline {
  --font-sans: 'Plus Jakarta Sans', 'Inter', sans-serif;
}
```

**Scale**:
- H1: `text-4xl font-bold` (40-48px)
- H2: `text-2xl font-semibold` (28-32px)
- H3: `text-xl font-semibold` (20-24px)
- Body: `text-base` (16px)
- Caption: `text-sm text-muted-foreground` (14px)

### Spacing

Use Tailwind's spacing scale:
- `gap-2` (8px) - Tight spacing
- `gap-4` (16px) - Default spacing
- `gap-6` (24px) - Section spacing
- `gap-8` (32px) - Large section spacing

### Border Radius

```css
--radius: 1rem; /* 16px for cards */
```

- Cards: `rounded-2xl` (16px)
- Buttons: `rounded-lg` (10px)
- Inputs: `rounded-md` (8px)
- Badges: `rounded-full`

### Shadows

- Cards: `shadow-sm` or `shadow-md`
- Elevated: `shadow-lg`
- Focus rings: `ring-2 ring-primary`

---

## Development Guidelines

### File Naming

- Components: `kebab-case.tsx` (e.g., `question-card.tsx`)
- Pages: `page.tsx` in route folders
- Utilities: `camelCase.ts`
- Types: `types.ts` with PascalCase interfaces

### Component Structure

```typescript
// components/example.tsx
'use client' // Only if needed

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExampleProps {
  title: string
  onAction?: () => void
  className?: string
}

export function Example({ title, onAction, className }: ExampleProps) {
  const [state, setState] = useState(false)
  
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3 className="font-semibold">{title}</h3>
      <Button onClick={onAction}>Action</Button>
    </div>
  )
}
```

### Database Queries

Always use RLS-compatible queries:

```typescript
// Good - RLS filters automatically
const { data } = await supabase
  .from('user_concept_mastery')
  .select('*')

// Bad - Don't manually filter by user_id when RLS handles it
const { data } = await supabase
  .from('user_concept_mastery')
  .select('*')
  .eq('user_id', userId) // Redundant with RLS
```

### Error Handling

```typescript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  return data
} catch (error) {
  console.error('[v0] Database error:', error)
  // Handle gracefully - show error UI or fallback
}
```

### State Management

- **Server State**: Use RSC + Server Actions
- **Client State**: Use `useState` for local, SWR for shared
- **Form State**: Use `useActionState` with Server Actions
- **URL State**: Use `searchParams` for filters/pagination

---

## Future Integration Points

### AI SDK Integration

Ready for AI SDK 6 integration:

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages, conceptContext } = await req.json()
  
  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: `You are an educational AI tutor helping a student learn ${conceptContext.name}...`,
    messages
  })
  
  return result.toDataStreamResponse()
}
```

### Real-Time Features

Supabase Realtime for collaborative features:

```typescript
// Listen for progress updates
supabase
  .channel('progress')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_concept_mastery'
  }, handleUpdate)
  .subscribe()
```

### Analytics Integration

Track learning events:

```typescript
// lib/analytics.ts
export function trackEvent(event: string, properties: object) {
  // Vercel Analytics, Mixpanel, etc.
}

// Usage
trackEvent('question_answered', {
  conceptId,
  isCorrect,
  timeSpent
})
```

---

## Appendix

### Environment Variables

```bash
# Supabase (auto-configured via integration)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (auto-configured)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Optional: AI (for AI chat integration)
AI_GATEWAY_API_KEY=
```

### Useful Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

### Testing Accounts

For development, create test users via `/auth/sign-up` with any email. Supabase will send confirmation emails to the provided address.

---

*Last updated: March 2026*
