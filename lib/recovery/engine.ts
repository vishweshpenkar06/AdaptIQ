import { createClient } from '@/lib/supabase/server';
import { toAccuracyUnit } from '@/lib/mastery-utils';

function toDbMasteryLevel(value: number, mode: 'percent' | 'fraction') {
  const clamped = Math.max(0, Math.min(1, value));
  return mode === 'fraction' ? Number(clamped.toFixed(2)) : Math.round(clamped * 100);
}

function masteryStatus(level: number): 'mastered' | 'in_progress' | 'weak' {
  if (level >= 0.8) return 'mastered';
  if (level >= 0.5) return 'in_progress';
  return 'weak';
}

function isMasteryWriteRetryable(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return (
    (text.includes('precision') && text.includes('scale'))
    || text.includes('user_concept_mastery_mastery_level_check')
    || (text.includes('check constraint') && text.includes('mastery_level'))
  );
}

function isGeneratedPlaceholderQuestion(row: { question_text: string; options: unknown }) {
  const text = (row.question_text ?? '').toLowerCase();
  if (text.includes('practice') && text.includes('choose the best answer for this concept check')) {
    return true;
  }

  if (!Array.isArray(row.options)) return false;
  const options = row.options.map((value) => String(value).toLowerCase());
  return (
    options.some((value) => value.includes('key idea'))
    && options.some((value) => value.includes('common mistake'))
    && options.some((value) => value.includes('unrelated rule'))
    && options.some((value) => value.includes('insufficient information'))
  );
}

export async function runRecoveryStep(userId: string, conceptId: string) {
  const supabase = await createClient();

  const [{ data: concept, error: conceptError }, { data: deps }] = await Promise.all([
    supabase
      .from('concepts')
      .select('id, name, description')
      .eq('id', conceptId)
      .single(),
    supabase
      .from('concept_dependencies')
      .select('prerequisite_id, concepts:prerequisite_id(name)')
      .eq('concept_id', conceptId)
      .limit(3),
  ]);

  if (conceptError || !concept) {
    throw new Error(conceptError?.message ?? 'Concept not found.');
  }

  const [{ data: questionRows, error: questionsError }, { data: attemptRows }] = await Promise.all([
    supabase
      .from('questions')
      .select('id, question_text, options, correct_answer, explanation, difficulty, concept_id, created_at')
      .eq('concept_id', conceptId)
      .limit(50),
    supabase
      .from('question_attempts')
      .select('question_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  const recency = new Map<string, number>();
  (attemptRows ?? []).forEach((row, index) => {
    const score = (attemptRows?.length ?? 0) - index;
    const previous = recency.get(row.question_id) ?? 0;
    if (score > previous) {
      recency.set(row.question_id, score);
    }
  });

  const allQuestions = questionRows ?? [];
  const curatedQuestions = allQuestions.filter((row) => !isGeneratedPlaceholderQuestion(row));
  const questionPool = curatedQuestions.length > 0 ? curatedQuestions : allQuestions;

  const rankedQuestions = [...questionPool]
    .map((row) => ({
      row,
      recencyScore: recency.get(row.id) ?? 0,
      difficulty: Number(row.difficulty ?? 3),
      randomTie: Math.random(),
    }))
    .sort((a, b) => {
      if (a.recencyScore !== b.recencyScore) return a.recencyScore - b.recencyScore;
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return a.randomTie - b.randomTie;
    })
    .slice(0, 3)
    .map((entry) => entry.row);

  const weakDependency = (deps ?? [])
    .map((row) => (Array.isArray(row.concepts) && row.concepts.length > 0 ? row.concepts[0]?.name : undefined))
    .find(Boolean) ?? 'prerequisite basics';

  const explanation = `${concept.name} is easier when you connect it to ${weakDependency}. Start by identifying the core rule, apply it to one short example, then solve one similar question on your own.`;

  return {
    explanation,
    questions: rankedQuestions.map((row) => ({
      id: row.id,
      questionText: row.question_text,
      options: Array.isArray(row.options) ? row.options.map(String) : [],
      correctAnswer: row.correct_answer,
      explanation: row.explanation ?? 'No explanation available.',
      difficulty: row.difficulty,
      conceptId: row.concept_id,
    })),
  };
}

export async function updateMastery(userId: string, conceptId: string, performance: number) {
  const supabase = await createClient();

  const perf = Math.max(0, Math.min(1, performance));
  const { data: masteryRow } = await supabase
    .from('user_concept_mastery')
    .select('mastery_level, attempts, correct_count')
    .eq('user_id', userId)
    .eq('concept_id', conceptId)
    .maybeSingle();

  const oldMastery = toAccuracyUnit(masteryRow?.mastery_level ?? 0);
  const newMastery = Math.max(0, Math.min(1, (oldMastery * 0.7) + (perf * 0.3)));
  const attempts = (masteryRow?.attempts ?? 0) + 1;
  const correctCount = (masteryRow?.correct_count ?? 0) + (perf >= 0.7 ? 1 : 0);
  const status = masteryStatus(newMastery);

  let { error } = await supabase
    .from('user_concept_mastery')
    .upsert({
      user_id: userId,
      concept_id: conceptId,
      mastery_level: toDbMasteryLevel(newMastery, 'percent'),
      status,
      attempts,
      correct_count: correctCount,
      last_practiced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,concept_id' });

  if (error && isMasteryWriteRetryable(error)) {
    const retry = await supabase
      .from('user_concept_mastery')
      .upsert({
        user_id: userId,
        concept_id: conceptId,
        mastery_level: toDbMasteryLevel(newMastery, 'fraction'),
        status,
        attempts,
        correct_count: correctCount,
        last_practiced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,concept_id' });
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    old_mastery: oldMastery,
    new_mastery: newMastery,
    status,
  };
}