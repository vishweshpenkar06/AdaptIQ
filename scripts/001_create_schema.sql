-- AdaptIQ Database Schema
-- Creates all tables for the intelligent learning system

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  grade TEXT DEFAULT 'Class 9',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concepts table (knowledge graph nodes)
CREATE TABLE IF NOT EXISTS public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept dependencies (knowledge graph edges)
CREATE TABLE IF NOT EXISTS public.concept_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  strength NUMERIC DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(concept_id, prerequisite_id),
  CHECK (concept_id != prerequisite_id)
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'fill_blank')),
  options JSONB, -- For MCQ: ["option1", "option2", "option3", "option4"]
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User concept mastery (tracks student progress per concept)
CREATE TABLE IF NOT EXISTS public.user_concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  mastery_level NUMERIC DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'weak', 'mastered')),
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, concept_id)
);

-- Practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  questions_attempted INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Question attempts (detailed log of each attempt)
CREATE TABLE IF NOT EXISTS public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnosis results (AI-generated insights)
CREATE TABLE IF NOT EXISTS public.diagnosis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_attempt_id UUID REFERENCES public.question_attempts(id) ON DELETE CASCADE,
  weak_concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  root_cause_concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  explanation TEXT,
  suggested_path JSONB, -- Array of concept IDs to study
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat history
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context JSONB, -- Additional context like current concept, question, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for subjects (public read, admin write)
CREATE POLICY "subjects_select_all" ON public.subjects FOR SELECT USING (true);

-- RLS Policies for concepts (public read)
CREATE POLICY "concepts_select_all" ON public.concepts FOR SELECT USING (true);

-- RLS Policies for concept_dependencies (public read)
CREATE POLICY "concept_dependencies_select_all" ON public.concept_dependencies FOR SELECT USING (true);

-- RLS Policies for questions (public read)
CREATE POLICY "questions_select_all" ON public.questions FOR SELECT USING (true);

-- RLS Policies for user_concept_mastery (own data only)
CREATE POLICY "user_concept_mastery_select_own" ON public.user_concept_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_concept_mastery_insert_own" ON public.user_concept_mastery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_concept_mastery_update_own" ON public.user_concept_mastery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_concept_mastery_delete_own" ON public.user_concept_mastery FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for practice_sessions (own data only)
CREATE POLICY "practice_sessions_select_own" ON public.practice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "practice_sessions_insert_own" ON public.practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "practice_sessions_update_own" ON public.practice_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "practice_sessions_delete_own" ON public.practice_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for question_attempts (own data only)
CREATE POLICY "question_attempts_select_own" ON public.question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "question_attempts_insert_own" ON public.question_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for diagnosis_results (own data only)
CREATE POLICY "diagnosis_results_select_own" ON public.diagnosis_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diagnosis_results_insert_own" ON public.diagnosis_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chat_messages (own data only)
CREATE POLICY "chat_messages_select_own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_concepts_subject ON public.concepts(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_concept ON public.questions(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_mastery_user ON public.user_concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mastery_concept ON public.user_concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user ON public.question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);
