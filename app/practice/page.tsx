'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { QuestionCard } from '@/components/question-card';
import { DiagnosisPanel } from '@/components/diagnosis-panel';
import { AIChatPanel } from '@/components/ai-chat-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { isSelectedAnswerCorrect } from '@/lib/answer-utils';
import { toAccuracyUnit, toConceptStatus } from '@/lib/mastery-utils';
import type { Concept, Question } from '@/lib/types';
import { CheckCircle2, XCircle, RotateCcw, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

type Dependency = {
  parentId: string;
  childId: string;
};

type SessionDiagnosis = {
  missingConcept: Concept;
  chain: Concept[];
  suggestion: string;
  rootCauseName: string;
};

type DiagnosisApiPayload = {
  diagnosis?: {
    root_cause?: { id?: string; name?: string };
    dependency_chain?: Array<{ id?: string; name?: string }>;
  };
};

function mapDifficulty(level: number | null): Question['difficulty'] {
  if (!level || level <= 2) return 'easy';
  if (level <= 4) return 'medium';
  return 'hard';
}

function normalizeDbError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  if (!error) return 'Unknown database error.';
  return error.details || error.hint || error.message || 'Unknown database error.';
}

function toDbMasteryLevel(accuracyUnit: number, mode: 'percent' | 'fraction') {
  const clamped = Math.max(0, Math.min(1, accuracyUnit));
  return mode === 'fraction' ? Number(clamped.toFixed(2)) : Math.round(clamped * 100);
}

function isMissingColumnError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes('column') && (text.includes('does not exist') || text.includes('schema cache'));
}

function isMasteryPrecisionError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes('precision') && text.includes('scale');
}

function isMasteryConstraintError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return (
    text.includes('user_concept_mastery_mastery_level_check')
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

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);
  const [sessionDiagnosis, setSessionDiagnosis] = useState<SessionDiagnosis | null>(null);
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
  const [lastIncorrect, setLastIncorrect] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [struggledConceptIds, setStruggledConceptIds] = useState<Set<string>>(new Set());
  const masteryRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCompletedSessionRef = useRef(false);

  const ensureActiveSession = async (
    supabase: ReturnType<typeof createClient>,
    activeUserId: string,
    conceptId: string | null,
  ) => {
    if (sessionId) return sessionId;

    const { data: createdSession, error: sessionCreateError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: activeUserId,
        concept_id: conceptId,
        status: 'active',
      })
      .select('id')
      .single();

    if (sessionCreateError || !createdSession?.id) {
      return null;
    }

    setSessionId(createdSession.id);
    return createdSession.id;
  };

  useEffect(() => {
    const loadPracticeData = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const conceptFilter = searchParams.get('concept');

      const [conceptsResult, masteryResult, dependenciesResult, questionsResult, attemptsResult] = await Promise.all([
        supabase
          .from('concepts')
          .select('id, name, description, subjects:subject_id(name)'),
        supabase
          .from('user_concept_mastery')
          .select('concept_id, mastery_level, status')
          .eq('user_id', user.id),
        supabase
          .from('concept_dependencies')
          .select('concept_id, prerequisite_id'),
        (conceptFilter
          ? supabase
              .from('questions')
              .select('id, question_text, options, correct_answer, explanation, difficulty, concept_id')
              .eq('concept_id', conceptFilter)
          : supabase
              .from('questions')
              .select('id, question_text, options, correct_answer, explanation, difficulty, concept_id'))
          .limit(500),
        supabase
          .from('question_attempts')
          .select('question_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      const masteryByConcept = new Map(
        (masteryResult.data ?? []).map((row) => [row.concept_id, row]),
      );

      const mappedConcepts: Concept[] = (conceptsResult.data ?? []).map((row) => {
        const mastery = masteryByConcept.get(row.id);
        const level = toAccuracyUnit(mastery?.mastery_level ?? 0);
        const subjectName = Array.isArray(row.subjects) && row.subjects.length > 0
          ? row.subjects[0]?.name ?? 'Physics'
          : 'Physics';

        return {
          id: row.id,
          name: row.name,
          subject: subjectName,
          chapter: subjectName,
          description: row.description ?? 'No description available yet.',
          accuracy: level,
          status: toConceptStatus(mastery?.status),
        };
      });

      const conceptPriority = new Map<string, number>();
      mappedConcepts.forEach((concept) => {
        const priority = concept.status === 'weak' || concept.status === 'missing' ? 0 : 1;
        conceptPriority.set(concept.id, priority);
      });

      const recencyByQuestion = new Map<string, number>();
      (attemptsResult.data ?? []).forEach((attempt, index) => {
        const score = (attemptsResult.data?.length ?? 0) - index;
        const previous = recencyByQuestion.get(attempt.question_id) ?? 0;
        if (score > previous) {
          recencyByQuestion.set(attempt.question_id, score);
        }
      });

      const allQuestionRows = questionsResult.data ?? [];
      const curatedQuestionRows = allQuestionRows.filter((row) => !isGeneratedPlaceholderQuestion(row));
      const questionPool = curatedQuestionRows.length > 0 ? curatedQuestionRows : allQuestionRows;

      const sortedQuestionRows = [...questionPool].sort((a, b) => {
        const priorityA = conceptPriority.get(a.concept_id ?? '') ?? 2;
        const priorityB = conceptPriority.get(b.concept_id ?? '') ?? 2;
        if (priorityA !== priorityB) return priorityA - priorityB;

        const recencyA = recencyByQuestion.get(a.id) ?? 0;
        const recencyB = recencyByQuestion.get(b.id) ?? 0;
        if (recencyA !== recencyB) return recencyA - recencyB;

        const difficultyA = Number(a.difficulty ?? 3);
        const difficultyB = Number(b.difficulty ?? 3);
        if (difficultyA !== difficultyB) return difficultyA - difficultyB;

        return Math.random() - 0.5;
      });

      const mappedQuestions: Question[] = sortedQuestionRows.map((row) => ({
        id: row.id,
        questionText: row.question_text,
        options: Array.isArray(row.options) ? row.options.map(String) : [],
        correctAnswer: row.correct_answer,
        difficulty: mapDifficulty(row.difficulty),
        explanation: row.explanation ?? 'No explanation available.',
        conceptIds: row.concept_id ? [row.concept_id] : [],
      }));

      const mappedDependencies: Dependency[] = (dependenciesResult.data ?? []).map((row) => ({
        parentId: row.prerequisite_id,
        childId: row.concept_id,
      }));

      const { data: hindsightRows } = await supabase
        .from('hindsight_events')
        .select('root_concept_id')
        .eq('user_id', user.id)
        .eq('resolved', false);

      const struggled = new Set(
        (hindsightRows ?? [])
          .map((row) => row.root_concept_id)
          .filter((id): id is string => !!id),
      );

      const { data: createdSession } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          concept_id: conceptFilter,
          status: 'active',
        })
        .select('id')
        .single();

      setConcepts(mappedConcepts);
      setQuestions(mappedQuestions);
      setDependencies(mappedDependencies);
      setStruggledConceptIds(struggled);
      setUserId(user.id);
      setSessionId(createdSession?.id ?? null);
      setIsLoading(false);
    };

    void loadPracticeData();
  }, [router, searchParams]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`practice-live:${userId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_concept_mastery',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (masteryRefreshTimeoutRef.current) return;
          masteryRefreshTimeoutRef.current = setTimeout(() => {
            masteryRefreshTimeoutRef.current = null;
            void supabase
              .from('user_concept_mastery')
              .select('concept_id, mastery_level, status')
              .eq('user_id', userId)
              .then(({ data }) => {
                if (!data) return;
                const masteryByConcept = new Map(data.map((row) => [row.concept_id, row]));
                setConcepts((prev) =>
                  prev.map((concept) => {
                    const mastery = masteryByConcept.get(concept.id);
                    if (!mastery) return concept;

                    return {
                      ...concept,
                      accuracy: toAccuracyUnit(mastery.mastery_level),
                      status: toConceptStatus(mastery.status),
                    };
                  }),
                );
              });
          }, 400);
        },
      )
      .subscribe();

    return () => {
      if (masteryRefreshTimeoutRef.current) {
        clearTimeout(masteryRefreshTimeoutRef.current);
        masteryRefreshTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
  const isComplete = currentIndex >= questions.length;

  const stats = useMemo(() => {
    const correct = answers.filter((a) => a.correct).length;
    const incorrect = answers.filter((a) => !a.correct).length;
    const accuracy = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
    return { correct, incorrect, accuracy };
  }, [answers]);

  const handleAnswer = async (payload: {
    isCorrect: boolean;
    selectedAnswer: string;
    timeTakenSeconds: number;
  }) => {
    if (!currentQuestion || isSavingAnswer) return;

    setIsSavingAnswer(true);

    const { selectedAnswer, timeTakenSeconds } = payload;
    const isCorrect = isSelectedAnswerCorrect(currentQuestion, selectedAnswer);

    const previousAnswers = answers;
    const previousLastIncorrect = lastIncorrect;

    setAnswers((prev) => [...prev, { questionId: currentQuestion.id, correct: isCorrect }]);
    setLastIncorrect(!isCorrect);

    if (!userId) {
      setIsSavingAnswer(false);
      return;
    }

    const supabase = createClient();

    const ensuredSessionId = await ensureActiveSession(
      supabase,
      userId,
      currentQuestion.conceptIds[0] ?? null,
    );

    const primaryAttemptPayload = {
      user_id: userId,
      question_id: currentQuestion.id,
      session_id: ensuredSessionId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken_seconds: timeTakenSeconds,
    };

    let { error: attemptError } = await supabase.from('question_attempts').insert(primaryAttemptPayload);

    // Backward-compatible retry for older schemas that may not have optional columns.
    if (attemptError) {
      const { error: fallbackAttemptError } = await supabase.from('question_attempts').insert({
        user_id: userId,
        question_id: currentQuestion.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
      });

      if (!fallbackAttemptError) {
        attemptError = null;
      }
    }

    if (attemptError) {
      setAnswers(previousAnswers);
      setLastIncorrect(previousLastIncorrect);
      toast.error('Could not save your answer.', {
        description: normalizeDbError(attemptError),
      });
      setIsSavingAnswer(false);
      return;
    }

    const conceptId = currentQuestion.conceptIds[0];
    if (!conceptId) {
      setIsSavingAnswer(false);
      return;
    }

    const { data: existingMastery, error: masteryFetchError } = await supabase
      .from('user_concept_mastery')
      .select('attempts, correct_count, mastery_level')
      .eq('user_id', userId)
      .eq('concept_id', conceptId)
      .maybeSingle();

    const useLegacyMasteryFallback = isMissingColumnError(masteryFetchError);

    if (masteryFetchError && !useLegacyMasteryFallback) {
      toast.error('Answer saved, but progress sync failed.');
      setIsSavingAnswer(false);
      return;
    }

    let masteryUpdateError: { message?: string; details?: string; hint?: string } | null = null;
    const nowIso = new Date().toISOString();

    const upsertMastery = async (payload: {
      user_id: string;
      concept_id: string;
      mastery_level: number;
      status: 'mastered' | 'in_progress' | 'weak';
      last_practiced_at: string;
      attempts?: number;
      correct_count?: number;
    }) => {
      const { error } = await supabase.from('user_concept_mastery').upsert(payload, {
        onConflict: 'user_id,concept_id',
      });
      return error;
    };

    if (useLegacyMasteryFallback) {
      const currentConcept = concepts.find((concept) => concept.id === conceptId);
      const baselineLevel = currentConcept?.accuracy ?? 0;
      const nextLevel = Math.max(0, Math.min(1, baselineLevel + (isCorrect ? 0.1 : -0.05)));
      const status =
        nextLevel >= 0.8
          ? 'mastered'
          : nextLevel >= 0.5
            ? 'in_progress'
            : 'weak';

      masteryUpdateError = await upsertMastery({
        user_id: userId,
        concept_id: conceptId,
        mastery_level: toDbMasteryLevel(nextLevel, 'percent'),
        status,
        last_practiced_at: nowIso,
      });

      if (isMasteryPrecisionError(masteryUpdateError) || isMasteryConstraintError(masteryUpdateError)) {
        masteryUpdateError = await upsertMastery({
          user_id: userId,
          concept_id: conceptId,
          mastery_level: toDbMasteryLevel(nextLevel, 'fraction'),
          status,
          last_practiced_at: nowIso,
        });
      }
    } else {
      const attempts = (existingMastery?.attempts ?? 0) + 1;
      const correctCount = (existingMastery?.correct_count ?? 0) + (isCorrect ? 1 : 0);
      const masteryLevel = attempts > 0 ? correctCount / attempts : 0;

      const status =
        masteryLevel >= 0.8
          ? 'mastered'
          : masteryLevel >= 0.5
            ? 'in_progress'
            : 'weak';

      masteryUpdateError = await upsertMastery({
        user_id: userId,
        concept_id: conceptId,
        attempts,
        correct_count: correctCount,
        mastery_level: toDbMasteryLevel(masteryLevel, 'percent'),
        status,
        last_practiced_at: nowIso,
      });

      if (isMasteryPrecisionError(masteryUpdateError) || isMasteryConstraintError(masteryUpdateError)) {
        masteryUpdateError = await upsertMastery({
          user_id: userId,
          concept_id: conceptId,
          attempts,
          correct_count: correctCount,
          mastery_level: toDbMasteryLevel(masteryLevel, 'fraction'),
          status,
          last_practiced_at: nowIso,
        });
      }
    }

    if (masteryUpdateError) {
      toast.error('Answer saved, but mastery update failed.', {
        description: normalizeDbError(masteryUpdateError),
      });
      setIsSavingAnswer(false);
      return;
    }

    if (ensuredSessionId) {
      const { error: sessionUpdateError } = await supabase
        .from('practice_sessions')
        .update({
          questions_attempted: answers.length + 1,
          correct_answers: answers.filter((answer) => answer.correct).length + (isCorrect ? 1 : 0),
        })
        .eq('id', ensuredSessionId);

      if (sessionUpdateError) {
        toast.error('Answer saved, but session progress update failed.');
        setIsSavingAnswer(false);
        return;
      }
    }

    toast.success('Answer saved successfully.');
    setIsSavingAnswer(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setLastIncorrect(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setSessionDiagnosis(null);
    setIsGeneratingDiagnosis(false);
    hasCompletedSessionRef.current = false;
    setLastIncorrect(false);
  };

  useEffect(() => {
    const completeSession = async () => {
      if (!isComplete || !sessionId || hasCompletedSessionRef.current) return;
      hasCompletedSessionRef.current = true;

      const supabase = createClient();
      await supabase
        .from('practice_sessions')
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed',
          questions_attempted: answers.length,
          correct_answers: answers.filter((answer) => answer.correct).length,
        })
        .eq('id', sessionId);

      const wrongQuestionIds = answers
        .filter((answer) => !answer.correct)
        .map((answer) => answer.questionId);

      if (wrongQuestionIds.length > 0) {
        setIsGeneratingDiagnosis(true);
        try {
          for (const questionId of wrongQuestionIds) {
            try {
              const response = await fetch('/api/diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question_id: questionId }),
              });

              if (!response.ok) {
                continue;
              }

              const payload: DiagnosisApiPayload = await response
                .json()
                .catch(() => ({} as DiagnosisApiPayload));

              const rootCause = payload?.diagnosis?.root_cause;
              if (!rootCause?.id) {
                continue;
              }

              const buildFallbackConcept = (id: string, name?: string): Concept => ({
                id,
                name: name ?? 'Unknown Concept',
                subject: 'Physics',
                chapter: 'Physics',
                description: 'No description available yet.',
                accuracy: 0,
                status: 'weak',
              });

              const missingConcept =
                concepts.find((concept) => concept.id === rootCause.id) ??
                buildFallbackConcept(rootCause.id, rootCause.name);

              const chain: Concept[] = (payload?.diagnosis?.dependency_chain ?? [])
                .filter((dep): dep is { id: string; name?: string } => Boolean(dep?.id))
                .map((dep) =>
                  concepts.find((concept) => concept.id === dep.id) ?? buildFallbackConcept(dep.id, dep.name),
                );

              const suggestion =
                chain.length > 0
                  ? `Focus on strengthening "${missingConcept.name}" by first reviewing ${chain
                      .map((concept) => `"${concept.name}"`)
                      .join(' and ')}.`
                  : `Focus on strengthening "${missingConcept.name}" through targeted practice.`;

              setSessionDiagnosis({
                missingConcept,
                chain,
                suggestion,
                rootCauseName: rootCause.name ?? missingConcept.name,
              });
              break;
            } catch {
              // Keep session completion resilient if diagnosis calls fail.
            }
          }
        } finally {
          setIsGeneratingDiagnosis(false);
        }
      }

      toast.success('Practice session completed.');
    };

    void completeSession();
  }, [isComplete, sessionId, answers, concepts]);

  // Get the current concept for context
  const currentConcept = currentQuestion?.conceptIds[0] 
    ? concepts.find((c) => c.id === currentQuestion.conceptIds[0]) 
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-350 px-4 py-8 lg:px-8">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading practice questions...
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-350 px-4 py-8 lg:px-8">
          <Card>
            <CardContent className="space-y-4 py-10 text-center">
              <p className="text-foreground">No practice questions available yet.</p>
              <p className="text-sm text-muted-foreground">Seed question data in the database to start practicing.</p>
              <Link href="/knowledge-map" className="inline-block">
                <Button>Go to Knowledge Map</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-350 px-4 py-8 pb-20 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Practice Session
            </h1>
            <p className="text-muted-foreground">
              Practice questions powered by your live database data
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
              <span className="font-medium text-foreground">{stats.correct}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-[#EF4444]" />
              <span className="font-medium text-foreground">{stats.incorrect}</span>
            </div>
            <Badge variant="outline" className="text-sm">
              {stats.accuracy}% Accuracy
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.min(currentIndex + 1, questions.length)} of {questions.length}</span>
          </div>
          <Progress value={progress} className="h-3 bg-muted [&>div]:bg-primary" />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Question Area */}
          <div className="lg:col-span-2 space-y-6">
            {!isComplete ? (
              <>
                {currentConcept && struggledConceptIds.has(currentConcept.id) ? (
                  <Card className="border-[#F59E0B]/40 bg-[#F59E0B]/8">
                    <CardContent className="py-3 text-sm text-foreground">
                      <span className="font-semibold">Warning:</span> You previously struggled with this concept.
                    </CardContent>
                  </Card>
                ) : null}

                <QuestionCard
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={questions.length}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  isSaving={isSavingAnswer}
                />
              </>
            ) : (
              /* Completion Screen */
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border bg-linear-to-r from-primary/5 via-[#22C55E]/5 to-[#38BDF8]/5">
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#22C55E]/10">
                      <Trophy className="h-10 w-10 text-[#22C55E]" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Practice Complete!</CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Great job finishing this session
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4 sm:grid-cols-3 mb-8">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold text-[#22C55E]">{stats.correct}</p>
                      <p className="text-sm text-muted-foreground">Correct</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold text-[#EF4444]">{stats.incorrect}</p>
                      <p className="text-sm text-muted-foreground">Incorrect</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold text-primary">{stats.accuracy}%</p>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                    </div>
                  </div>

                  {isGeneratingDiagnosis ? (
                    <Card className="mb-6 border-border bg-muted/20">
                      <CardContent className="py-4 text-sm text-muted-foreground">
                        Generating root cause analysis and recovery plan...
                      </CardContent>
                    </Card>
                  ) : null}

                  {sessionDiagnosis ? (
                    <div className="mb-6">
                      <DiagnosisPanel
                        missingConcept={sessionDiagnosis.missingConcept}
                        dependencyChain={sessionDiagnosis.chain}
                        suggestion={sessionDiagnosis.suggestion}
                        rootCauseName={sessionDiagnosis.rootCauseName}
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button onClick={handleRestart} variant="outline" className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Practice Again
                    </Button>
                    <Link href="/knowledge-map">
                      <Button className="w-full sm:w-auto">
                        View Knowledge Map
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Chat Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <AIChatPanel
                currentQuestion={currentQuestion}
                currentConcept={currentConcept}
                isAnswerIncorrect={lastIncorrect}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
