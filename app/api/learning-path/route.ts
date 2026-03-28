import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLearningPath } from '@/lib/learning-path/generator';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: pathRows, error } = await supabase
    .from('learning_paths')
    .select('id, root_concept_id, path, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pathRows || pathRows.length === 0) {
    return NextResponse.json({ active_path: null, path_history: [] });
  }

  const pathIds = pathRows.map((row) => row.id);

  const { data: itemRows, error: itemsError } = await supabase
    .from('learning_path_items')
    .select('path_id, concept_id, completed_at')
    .in('path_id', pathIds);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const groupedItems = new Map<string, Array<{ concept_id: string; completed_at: string | null }>>();
  (itemRows ?? []).forEach((item) => {
    const current = groupedItems.get(item.path_id) ?? [];
    current.push({ concept_id: item.concept_id, completed_at: item.completed_at });
    groupedItems.set(item.path_id, current);
  });

  const pathHistory = pathRows.map((path) => {
    const items = groupedItems.get(path.id) ?? [];
    const completionByConceptId = Object.fromEntries(
      items.map((item) => [item.concept_id, item.completed_at]),
    );
    const completedSteps = items.filter((item) => Boolean(item.completed_at)).length;
    const totalSteps = Array.isArray(path.path) ? path.path.length : items.length;

    return {
      ...path,
      completion_by_concept_id: completionByConceptId,
      completed_steps: completedSteps,
      total_steps: totalSteps,
    };
  });

  const activePath = pathHistory.find((path) => path.status === 'active' || path.status === 'in_progress')
    ?? pathHistory[0]
    ?? null;

  return NextResponse.json({
    active_path: activePath,
    path_history: pathHistory,
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rootConceptId = (payload as { root_concept_id?: string })?.root_concept_id;
  if (!rootConceptId) {
    return NextResponse.json({ error: 'root_concept_id is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await generateLearningPath(user.id, rootConceptId);
    return NextResponse.json({ path: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not generate learning path.' },
      { status: 500 },
    );
  }
}