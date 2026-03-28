-- Hindsight + Recovery MVP schema additions

-- 1) Hindsight events
CREATE TABLE IF NOT EXISTS public.hindsight_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  root_concept_id UUID REFERENCES public.concepts(id),
  dependency_chain JSONB,
  mistake_type TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Learning path headers
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  root_concept_id UUID REFERENCES public.concepts(id),
  path JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward-compatible upgrades in case table existed before this migration.
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS root_concept_id UUID REFERENCES public.concepts(id);
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS path JSONB;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure allowed statuses if old table had no check constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'learning_paths_status_check'
      AND conrelid = 'public.learning_paths'::regclass
  ) THEN
    ALTER TABLE public.learning_paths
      ADD CONSTRAINT learning_paths_status_check
      CHECK (status IN ('active', 'in_progress', 'completed'));
  END IF;
END $$;

-- 3) Learning path items (hybrid model for efficient progress tracking)
CREATE TABLE IF NOT EXISTS public.learning_path_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(path_id, concept_id),
  UNIQUE(path_id, order_index)
);

ALTER TABLE public.hindsight_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hindsight_events_select_own" ON public.hindsight_events;
DROP POLICY IF EXISTS "hindsight_events_insert_own" ON public.hindsight_events;
DROP POLICY IF EXISTS "hindsight_events_update_own" ON public.hindsight_events;

CREATE POLICY "hindsight_events_select_own" ON public.hindsight_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hindsight_events_insert_own" ON public.hindsight_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hindsight_events_update_own" ON public.hindsight_events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_paths_select_own" ON public.learning_paths;
DROP POLICY IF EXISTS "learning_paths_insert_own" ON public.learning_paths;
DROP POLICY IF EXISTS "learning_paths_update_own" ON public.learning_paths;
DROP POLICY IF EXISTS "learning_paths_delete_own" ON public.learning_paths;

CREATE POLICY "learning_paths_select_own" ON public.learning_paths
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "learning_paths_insert_own" ON public.learning_paths
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learning_paths_update_own" ON public.learning_paths
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "learning_paths_delete_own" ON public.learning_paths
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_path_items_select_own" ON public.learning_path_items;
DROP POLICY IF EXISTS "learning_path_items_insert_own" ON public.learning_path_items;
DROP POLICY IF EXISTS "learning_path_items_update_own" ON public.learning_path_items;
DROP POLICY IF EXISTS "learning_path_items_delete_own" ON public.learning_path_items;

CREATE POLICY "learning_path_items_select_own" ON public.learning_path_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_items.path_id
      AND lp.user_id = auth.uid()
    )
  );
CREATE POLICY "learning_path_items_insert_own" ON public.learning_path_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_items.path_id
      AND lp.user_id = auth.uid()
    )
  );
CREATE POLICY "learning_path_items_update_own" ON public.learning_path_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_items.path_id
      AND lp.user_id = auth.uid()
    )
  );
CREATE POLICY "learning_path_items_delete_own" ON public.learning_path_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = learning_path_items.path_id
      AND lp.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_hindsight_events_user_created ON public.hindsight_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hindsight_events_root_concept ON public.hindsight_events(user_id, root_concept_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_status_created ON public.learning_paths(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_path_items_path_order ON public.learning_path_items(path_id, order_index);