import { createClient } from '@/lib/supabase/server';
import { safeRetainLearningEvent } from '@/lib/hindsight/client';

type StoreHindsightEventInput = {
  userId: string;
  questionId: string;
  rootConceptId: string;
  dependencyChain: Array<{ id: string; name?: string; mastery?: number }>;
  mistakeType?: string;
};

export async function storeHindsightEvent(input: StoreHindsightEventInput) {
  const supabase = await createClient();

  const { error } = await supabase.from('hindsight_events').insert({
    user_id: input.userId,
    question_id: input.questionId,
    root_concept_id: input.rootConceptId,
    dependency_chain: input.dependencyChain,
    mistake_type: input.mistakeType ?? 'concept_gap',
    resolved: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const serializedChain = input.dependencyChain
    .map((node) => `${node.name ?? node.id}`)
    .join(' -> ');

  // Dual-write during migration: local DB stays authoritative while Hindsight receives async facts.
  void safeRetainLearningEvent(
    input.userId,
    `Incorrect answer on question ${input.questionId}. Root concept: ${input.rootConceptId}. Dependency chain: ${serializedChain || 'none'}.`,
    {
      questionId: input.questionId,
      rootConceptId: input.rootConceptId,
      dependencyChain: input.dependencyChain,
      mistakeType: input.mistakeType ?? 'concept_gap',
    },
  );
}

export async function getHindsightSummary(userId: string) {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('hindsight_events')
    .select('id, root_concept_id, mistake_type, resolved, created_at, concepts:root_concept_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const failureCountByConcept = new Map<string, { conceptId: string; conceptName: string; count: number }>();

  (events ?? []).forEach((event) => {
    if (!event.root_concept_id) return;
    const key = event.root_concept_id;
    const current = failureCountByConcept.get(key);
    const conceptName = Array.isArray(event.concepts) && event.concepts.length > 0
      ? event.concepts[0]?.name ?? 'Unknown Concept'
      : 'Unknown Concept';

    if (!current) {
      failureCountByConcept.set(key, {
        conceptId: key,
        conceptName,
        count: 1,
      });
    } else {
      current.count += 1;
      failureCountByConcept.set(key, current);
    }
  });

  const recurring = Array.from(failureCountByConcept.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    failure_count_per_concept: recurring,
    recent_mistakes: (events ?? []).slice(0, 10),
  };
}