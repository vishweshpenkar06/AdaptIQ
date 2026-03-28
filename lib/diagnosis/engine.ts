import { createClient } from '@/lib/supabase/server';
import { toAccuracyUnit } from '@/lib/mastery-utils';

type DiagnosisConcept = {
  id: string;
  name: string;
  mastery: number;
};

export type DiagnosisResult = {
  root_cause: DiagnosisConcept;
  dependency_chain: DiagnosisConcept[];
  status: 'missing' | 'weak' | 'strong';
};

function statusFromMastery(mastery: number): DiagnosisResult['status'] {
  if (mastery < 0.4) return 'missing';
  if (mastery < 0.7) return 'weak';
  return 'strong';
}

export async function diagnose(userId: string, questionId: string): Promise<DiagnosisResult> {
  const supabase = await createClient();

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, concept_id')
    .eq('id', questionId)
    .single();

  if (questionError || !question?.concept_id) {
    throw new Error('Could not load question concept for diagnosis.');
  }

  const seedConceptId = question.concept_id;
  const visited = new Set<string>([seedConceptId]);
  const depthMap = new Map<string, number>([[seedConceptId, 0]]);
  const queue: Array<{ conceptId: string; depth: number }> = [{ conceptId: seedConceptId, depth: 0 }];

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

  const [{ data: concepts }, { data: masteryRows }] = await Promise.all([
    supabase
      .from('concepts')
      .select('id, name')
      .in('id', conceptIds),
    supabase
      .from('user_concept_mastery')
      .select('concept_id, mastery_level')
      .eq('user_id', userId)
      .in('concept_id', conceptIds),
  ]);

  const masteryByConcept = new Map(
    (masteryRows ?? []).map((row) => [row.concept_id, toAccuracyUnit(row.mastery_level)]),
  );

  const resolved: Array<DiagnosisConcept & { depth: number }> = (concepts ?? []).map((concept) => ({
    id: concept.id,
    name: concept.name,
    mastery: masteryByConcept.get(concept.id) ?? 0,
    depth: depthMap.get(concept.id) ?? 2,
  }));

  resolved.sort((a, b) => {
    if (a.mastery !== b.mastery) return a.mastery - b.mastery;
    return b.depth - a.depth;
  });

  const root = resolved[0] ?? {
    id: seedConceptId,
    name: 'Unknown Concept',
    mastery: 0,
    depth: 0,
  };

  const chain = resolved
    .filter((concept) => concept.id !== root.id)
    .sort((a, b) => a.depth - b.depth)
    .map(({ id, name, mastery }) => ({ id, name, mastery }));

  return {
    root_cause: { id: root.id, name: root.name, mastery: root.mastery },
    dependency_chain: chain,
    status: statusFromMastery(root.mastery),
  };
}