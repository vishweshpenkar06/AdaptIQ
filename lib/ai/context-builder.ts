import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { toAccuracyUnit } from '@/lib/mastery-utils';

export type BuildAIContextInput = {
  userId: string;
  questionId?: string;
  conceptId?: string;
  mistakeType?: string;
};

export type AIContext = {
  student_level: string;
  concept: string;
  dependencies: string[];
  mastery: Record<string, number>;
  past_mistakes: string[];
  question: string;
  mistake_type: string;
};

async function resolveSeedConceptId(input: BuildAIContextInput) {
  if (input.conceptId) return input.conceptId;
  if (!input.questionId) return null;

  const supabase = await createClient();
  const { data: question } = await supabase
    .from('questions')
    .select('concept_id')
    .eq('id', input.questionId)
    .maybeSingle();

  return question?.concept_id ?? null;
}

export async function buildAIContext(input: BuildAIContextInput): Promise<AIContext> {
  const supabase = await createClient();
  const seedConceptId = await resolveSeedConceptId(input);

  const visited = new Set<string>();
  const depthMap = new Map<string, number>();
  const queue: Array<{ conceptId: string; depth: number }> = [];

  if (seedConceptId) {
    visited.add(seedConceptId);
    depthMap.set(seedConceptId, 0);
    queue.push({ conceptId: seedConceptId, depth: 0 });
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.depth >= 2) continue;

    const { data: prereqs } = await supabase
      .from('concept_dependencies')
      .select('prerequisite_id')
      .eq('concept_id', current.conceptId);

    (prereqs ?? []).forEach((row) => {
      if (!row.prerequisite_id || visited.has(row.prerequisite_id)) return;
      visited.add(row.prerequisite_id);
      depthMap.set(row.prerequisite_id, current.depth + 1);
      queue.push({ conceptId: row.prerequisite_id, depth: current.depth + 1 });
    });
  }

  const conceptIds = Array.from(visited);

  const [{ data: profileRow }, { data: conceptRows }, { data: masteryRows }, { data: questionRow }, { data: hindsightRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('grade')
      .eq('id', input.userId)
      .maybeSingle(),
    conceptIds.length > 0
      ? supabase
          .from('concepts')
          .select('id, name')
          .in('id', conceptIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    conceptIds.length > 0
      ? supabase
          .from('user_concept_mastery')
          .select('concept_id, mastery_level')
          .eq('user_id', input.userId)
          .in('concept_id', conceptIds)
      : Promise.resolve({ data: [] as Array<{ concept_id: string; mastery_level: number | null }> }),
    input.questionId
      ? supabase
          .from('questions')
          .select('question_text')
          .eq('id', input.questionId)
          .maybeSingle()
      : Promise.resolve({ data: null as { question_text?: string } | null }),
    supabase
      .from('hindsight_events')
      .select('root_concept_id, concepts:root_concept_id(name)')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const conceptNameById = new Map((conceptRows ?? []).map((row) => [row.id, row.name]));
  const masteryByConceptId = new Map(
    (masteryRows ?? []).map((row) => [row.concept_id, toAccuracyUnit(row.mastery_level)]),
  );

  const rootConceptName = seedConceptId ? (conceptNameById.get(seedConceptId) ?? 'Unknown Concept') : 'General Learning';
  const dependencies = conceptIds
    .filter((id) => id !== seedConceptId)
    .sort((a, b) => (depthMap.get(a) ?? 9) - (depthMap.get(b) ?? 9))
    .map((id) => conceptNameById.get(id) ?? id);

  const mastery: Record<string, number> = {};
  conceptIds.forEach((id) => {
    const conceptName = conceptNameById.get(id) ?? id;
    mastery[conceptName] = masteryByConceptId.get(id) ?? 0;
  });

  const mistakeCountByConceptName = new Map<string, number>();
  (hindsightRows ?? []).forEach((row) => {
    const conceptName = Array.isArray(row.concepts) && row.concepts.length > 0
      ? row.concepts[0]?.name ?? 'Unknown Concept'
      : 'Unknown Concept';
    const previous = mistakeCountByConceptName.get(conceptName) ?? 0;
    mistakeCountByConceptName.set(conceptName, previous + 1);
  });

  const pastMistakes = Array.from(mistakeCountByConceptName.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([conceptName, count]) => `Struggled with ${conceptName} in ${count} questions`);

  return {
    student_level: profileRow?.grade ?? 'Class 9',
    concept: rootConceptName,
    dependencies,
    mastery,
    past_mistakes: pastMistakes,
    question: questionRow?.question_text ?? '',
    mistake_type: input.mistakeType ?? 'conceptual',
  };
}
