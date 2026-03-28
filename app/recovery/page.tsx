'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type PathConcept = {
  concept_id: string;
  concept_name: string;
  order: number;
  score: number;
  completed_at?: string | null;
};

type RecoveryQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type RecoveryPlan = {
  id: string;
  root_concept_id: string | null;
  status: 'active' | 'in_progress' | 'completed';
  created_at: string;
  path: PathConcept[];
  completion_by_concept_id?: Record<string, string | null>;
  completed_steps?: number;
  total_steps?: number;
};

export default function RecoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [pathId, setPathId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<RecoveryPlan[]>([]);
  const [pathConcepts, setPathConcepts] = useState<PathConcept[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [questions, setQuestions] = useState<RecoveryQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [isSavingStep, setIsSavingStep] = useState(false);

  const activeConcept = pathConcepts[stepIndex] ?? null;
  const activePlans = useMemo(
    () => pathHistory.filter((plan) => plan.status === 'active' || plan.status === 'in_progress'),
    [pathHistory],
  );
  const pastPlans = useMemo(
    () => pathHistory.filter((plan) => plan.status === 'completed'),
    [pathHistory],
  );

  const selectPlan = (plan: RecoveryPlan) => {
    const completionByConceptId = plan.completion_by_concept_id ?? {};
    const concepts = (Array.isArray(plan.path) ? plan.path : [])
      .map((concept) => ({
        ...concept,
        completed_at: completionByConceptId[concept.concept_id] ?? concept.completed_at ?? null,
      }))
      .sort((a, b) => a.order - b.order);

    const firstIncompleteIndex = concepts.findIndex((concept) => !concept.completed_at);
    setPathId(plan.id);
    setPathConcepts(concepts);
    setStepIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
    setExplanation('');
    setQuestions([]);
    setSelected({});
  };

  useEffect(() => {
    const loadRecoveryPlan = async () => {
      const conceptFromQuery = searchParams.get('concept');

      let activePath = null as null | {
        id: string;
        root_concept_id: string;
        path: PathConcept[];
        completion_by_concept_id?: Record<string, string | null>;
      };

      const activeResponse = await fetch('/api/learning-path', { method: 'GET' });
      const activeData = await activeResponse.json().catch(() => ({}));
      if (activeResponse.ok && Array.isArray(activeData?.path_history)) {
        setPathHistory(activeData.path_history as RecoveryPlan[]);
      }

      if (activeResponse.ok && activeData?.active_path) {
        activePath = activeData.active_path;
      }

      if (!activePath && conceptFromQuery) {
        const generatedResponse = await fetch('/api/learning-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ root_concept_id: conceptFromQuery }),
        });
        const generatedData = await generatedResponse.json().catch(() => ({}));
        if (generatedResponse.ok && generatedData?.path) {
          activePath = {
            id: generatedData.path.pathId,
            root_concept_id: generatedData.path.rootConceptId,
            path: generatedData.path.concepts.map((item: {
              conceptId: string;
              conceptName: string;
              order: number;
              score: number;
            }) => ({
              concept_id: item.conceptId,
              concept_name: item.conceptName,
              order: item.order,
              score: item.score,
            })),
          };
        }
      }

      if (!activePath || !Array.isArray(activePath.path) || activePath.path.length === 0) {
        setIsLoading(false);
        return;
      }

      const selectedPathId = searchParams.get('pathId');
      const availablePlans = (activeData?.path_history ?? []) as RecoveryPlan[];
      const selectedFromHistory = selectedPathId
        ? availablePlans.find(
            (plan) => plan.id === selectedPathId && (plan.status === 'active' || plan.status === 'in_progress'),
          )
        : null;

      if (selectedFromHistory) {
        selectPlan(selectedFromHistory);
      } else {
        // Require explicit user selection of an active recovery unless a valid active pathId is in the URL.
        setPathId(null);
        setPathConcepts([]);
        setStepIndex(0);
        setExplanation('');
        setQuestions([]);
        setSelected({});
      }

      setIsLoading(false);
    };

    void loadRecoveryPlan();
  }, [searchParams]);

  useEffect(() => {
    const loadStep = async () => {
      if (!activeConcept) return;

      const response = await fetch('/api/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: activeConcept.concept_id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setExplanation('Recovery guidance is currently unavailable.');
        setQuestions([]);
        return;
      }

      setExplanation(data.explanation ?? 'Review the concept and solve the questions below.');
      setQuestions(data.questions ?? []);
      setSelected({});
    };

    void loadStep();
  }, [activeConcept]);

  const progress = useMemo(() => {
    if (pathConcepts.length === 0) return 0;
    return Math.round(((stepIndex + 1) / pathConcepts.length) * 100);
  }, [stepIndex, pathConcepts.length]);

  const completedCount = useMemo(
    () => pathConcepts.filter((concept) => Boolean(concept.completed_at)).length,
    [pathConcepts],
  );

  const handleCompleteStep = async () => {
    if (!activeConcept || isSavingStep) return;
    setIsSavingStep(true);

    const answered = questions.filter((q) => selected[q.id]);
    const correct = answered.filter((q) => selected[q.id] === q.correctAnswer);
    const performance = answered.length > 0 ? correct.length / answered.length : 0;

    const patchResponse = await fetch('/api/recovery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept_id: activeConcept.concept_id, path_id: pathId, performance }),
    });

    const patchData = await patchResponse.json().catch(() => ({} as { path_status?: string }));

    if (!patchResponse.ok) {
      setIsSavingStep(false);
      return;
    }

    const completedAt = new Date().toISOString();

    setPathConcepts((prev) =>
      prev.map((concept, index) =>
        index === stepIndex
          ? {
              ...concept,
              completed_at: completedAt,
            }
          : concept,
      ),
    );

    setPathHistory((prev) =>
      prev.map((plan) => {
        if (plan.id !== pathId) return plan;

        const completionMap = {
          ...(plan.completion_by_concept_id ?? {}),
          [activeConcept.concept_id]: completedAt,
        };
        const totalSteps = plan.total_steps ?? (Array.isArray(plan.path) ? plan.path.length : 0);
        const completedSteps = Object.values(completionMap).filter(Boolean).length;

        return {
          ...plan,
          completion_by_concept_id: completionMap,
          completed_steps: completedSteps,
          total_steps: totalSteps,
          status: patchData.path_status ?? plan.status,
        };
      }),
    );

    const completedFromApi = patchData.path_status === 'completed';

    if (!completedFromApi && stepIndex < pathConcepts.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      const nextPlan = pathHistory.find(
        (plan) => plan.id !== pathId && (plan.status === 'active' || plan.status === 'in_progress'),
      );

      if (nextPlan) {
        selectPlan(nextPlan);
      } else {
        router.push('/progress');
        router.refresh();
      }
    }

    setIsSavingStep(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading recovery plan...
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!activeConcept) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Select an Active Recovery</CardTitle>
                  <CardDescription>
                    Choose an active plan from Recovery History to start solving. Completed plans stay in Past Recovery for reference.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Link href="/knowledge-map"><Button>Open Knowledge Map</Button></Link>
                  <Link href="/practice"><Button variant="outline">Go to Practice</Button></Link>
                </CardContent>
              </Card>
            </div>

            <aside>
              <Card>
                <CardHeader>
                  <CardTitle>Recovery History</CardTitle>
                  <CardDescription>Active and past plans</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Recovery</p>
                    {activePlans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active plans.</p>
                    ) : (
                      activePlans.map((plan) => {
                        const total = plan.total_steps ?? (Array.isArray(plan.path) ? plan.path.length : 0);
                        const completed = plan.completed_steps ?? 0;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => selectPlan(plan)}
                            className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{plan.root_concept_id ? `${plan.root_concept_id.slice(0, 8)}...` : 'Unknown concept'}</span>
                              <Badge variant="outline" className="text-[11px] capitalize">{plan.status.replace('_', ' ')}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Completed {completed}/{total}</p>
                            <p className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleString()}</p>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past Recovery</p>
                    {pastPlans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No completed plans yet.</p>
                    ) : (
                      pastPlans.map((plan) => {
                        const total = plan.total_steps ?? (Array.isArray(plan.path) ? plan.path.length : 0);
                        const completed = plan.completed_steps ?? 0;

                        return (
                          <div
                            key={plan.id}
                            className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{plan.root_concept_id ? `${plan.root_concept_id.slice(0, 8)}...` : 'Unknown concept'}</span>
                              <Badge variant="outline" className="text-[11px] capitalize">{plan.status.replace('_', ' ')}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Completed {completed}/{total}</p>
                            <p className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleString()}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Recovery Plan</h1>
          <p className="text-muted-foreground">Step {stepIndex + 1} of {pathConcepts.length}: strengthen weak prerequisites first.</p>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{activeConcept.concept_name}</CardTitle>
                  <Badge variant="outline">Priority {activeConcept.order}</Badge>
                </div>
                <CardDescription>Deterministic recovery explanation for this step.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recovery Practice</CardTitle>
                <CardDescription>Answer quick checks for this concept.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-border p-4">
                    <p className="mb-3 font-medium text-foreground">{q.questionText}</p>
                    <div className="grid gap-2">
                      {q.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelected((prev) => ({ ...prev, [q.id]: option }))}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${selected[q.id] === option ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button onClick={handleCompleteStep} disabled={isSavingStep}>
                    {isSavingStep ? 'Saving...' : stepIndex < pathConcepts.length - 1 ? 'Next Step' : 'Finish Recovery'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside>
            <Card>
              <CardHeader>
                <CardTitle>Plan Sequence</CardTitle>
                <CardDescription>Completed {completedCount}/{pathConcepts.length}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pathConcepts.map((concept, index) => (
                  <div
                    key={`${concept.concept_id}-${index}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${index === stepIndex ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <span>{index + 1}. {concept.concept_name}</span>
                    {concept.completed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Done
                      </span>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recovery History</CardTitle>
                <CardDescription>Active and past plans</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Recovery</p>
                  {activePlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active plans.</p>
                  ) : (
                    activePlans.map((plan) => {
                      const total = plan.total_steps ?? (Array.isArray(plan.path) ? plan.path.length : 0);
                      const completed = plan.completed_steps ?? 0;
                      const isSelected = plan.id === pathId;

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => selectPlan(plan)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{plan.root_concept_id ? `${plan.root_concept_id.slice(0, 8)}...` : 'Unknown concept'}</span>
                            <Badge variant="outline" className="text-[11px] capitalize">{plan.status.replace('_', ' ')}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Completed {completed}/{total}</p>
                          <p className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleString()}</p>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past Recovery</p>
                  {pastPlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No completed plans yet.</p>
                  ) : (
                    pastPlans.map((plan) => {
                      const total = plan.total_steps ?? (Array.isArray(plan.path) ? plan.path.length : 0);
                      const completed = plan.completed_steps ?? 0;

                      return (
                        <div
                          key={plan.id}
                          className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{plan.root_concept_id ? `${plan.root_concept_id.slice(0, 8)}...` : 'Unknown concept'}</span>
                            <Badge variant="outline" className="text-[11px] capitalize">{plan.status.replace('_', ' ')}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Completed {completed}/{total}</p>
                          <p className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleString()}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
