import { createClient } from '@/lib/supabase/server';
import { toAccuracyUnit } from '@/lib/mastery-utils';
import { recallLearningSignals } from '@/lib/hindsight/client';

export type GeneratedLearningPath = {
  pathId: string;
  rootConceptId: string;
  concepts: Array<{
    conceptId: string;
    conceptName: string;
    mastery: number;
    failureCount: number;
    score: number;
    order: number;
  }>;
};

export async function generateLearningPath(userId: string, rootConceptId: string): Promise<GeneratedLearningPath> {
  const supabase = await createClient();

  const visited = new Set<string>([rootConceptId]);
  const depthMap = new Map<string, number>([[rootConceptId, 0]]);
  const queue: Array<{ conceptId: string; depth: number }> = [{ conceptId: rootConceptId, depth: 0 }];

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
  const [{ data: concepts }, { data: masteryRows }, { data: hindsightRows }, recallResults] = await Promise.all([
    supabase
      .from('concepts')
      .select('id, name')
      .in('id', conceptIds),
    supabase
      .from('user_concept_mastery')
      .select('concept_id, mastery_level')
      .eq('user_id', userId)
      .in('concept_id', conceptIds),
    supabase
      .from('hindsight_events')
      .select('root_concept_id')
      .eq('user_id', userId)
      .in('root_concept_id', conceptIds),
    recallLearningSignals(userId, 'Which concepts do I repeatedly struggle with in physics?'),
  ]);

  const masteryByConcept = new Map(
    (masteryRows ?? []).map((row) => [row.concept_id, toAccuracyUnit(row.mastery_level)]),
  );

  const failureCountByConcept = new Map<string, number>();
  (hindsightRows ?? []).forEach((row) => {
    if (!row.root_concept_id) return;
    const current = failureCountByConcept.get(row.root_concept_id) ?? 0;
    failureCountByConcept.set(row.root_concept_id, current + 1);
  });

  const conceptIdByNormalizedName = new Map<string, string>();
  (concepts ?? []).forEach((concept) => {
    conceptIdByNormalizedName.set(concept.name.trim().toLowerCase(), concept.id);
  });

  recallResults.forEach((result) => {
    const rawConceptId = typeof result.metadata?.rootConceptId === 'string'
      ? result.metadata.rootConceptId
      : null;
    const rawConceptName = typeof result.metadata?.conceptName === 'string'
      ? result.metadata.conceptName
      : null;

    const resolvedConceptId = rawConceptId && conceptIds.includes(rawConceptId)
      ? rawConceptId
      : rawConceptName
        ? conceptIdByNormalizedName.get(rawConceptName.trim().toLowerCase())
        : null;

    if (!resolvedConceptId) return;
    const current = failureCountByConcept.get(resolvedConceptId) ?? 0;
    failureCountByConcept.set(resolvedConceptId, current + 1);
  });

  const scored = (concepts ?? [])
    .map((concept) => {
      const mastery = masteryByConcept.get(concept.id) ?? 0;
      const failureCount = failureCountByConcept.get(concept.id) ?? 0;
      const score = (1 - mastery) + (failureCount * 0.2);

      return {
        conceptId: concept.id,
        conceptName: concept.name,
        mastery,
        failureCount,
        score,
        depth: depthMap.get(concept.id) ?? 2,
      };
    })
    .filter((concept) => concept.mastery < 0.7)
    .sort((a, b) => {
      if (a.depth !== b.depth) return b.depth - a.depth;
      return b.score - a.score;
    })
    .map((concept, index) => ({ ...concept, order: index + 1 }));

  const pathPayload = scored.map((item) => ({
    concept_id: item.conceptId,
    concept_name: item.conceptName,
    order: item.order,
    score: Number(item.score.toFixed(3)),
  }));

  const { data: pathRow, error: pathError } = await supabase
    .from('learning_paths')
    .insert({
      user_id: userId,
      root_concept_id: rootConceptId,
      path: pathPayload,
      status: 'active',
    })
    .select('id')
    .single();

  if (pathError || !pathRow?.id) {
    throw new Error(pathError?.message ?? 'Could not create learning path.');
  }

  if (scored.length > 0) {
    const { error: itemsError } = await supabase
      .from('learning_path_items')
      .insert(
        scored.map((item) => ({
          path_id: pathRow.id,
          concept_id: item.conceptId,
          order_index: item.order,
        })),
      );

    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  return {
    pathId: pathRow.id,
    rootConceptId,
    concepts: scored.map(({ depth: _depth, ...rest }) => rest),
  };
}