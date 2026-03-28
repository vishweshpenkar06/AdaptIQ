"use client";

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { StatCard } from '@/components/stat-card';
import { ConceptCard } from '@/components/concept-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  BookOpen, 
  ArrowRight,
  Brain,
  Lightbulb,
  Sparkles,
  RefreshCcw,
  TriangleAlert
} from 'lucide-react';
import Link from 'next/link';
import type { Concept } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { RealtimePageRefresh } from '@/components/realtime-page-refresh';
import { toAccuracyUnit, toConceptStatus } from '@/lib/mastery-utils';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Learner');
  const [mappedConcepts, setMappedConcepts] = useState<Concept[]>([]);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<{ root_concept_id: string | null; path: Array<{ concept_name?: string }> } | null>(null);
  const [recurringMistakes, setRecurringMistakes] = useState<Array<{ conceptId: string; conceptName: string; count: number }>>([]);

  const getSubjectName = (subjects: { name: string }[] | null | undefined) => {
    if (!subjects || subjects.length === 0) return 'Physics';
    return subjects[0]?.name ?? 'Physics';
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      const supabase = createClient();
      const diagnostics: string[] = [];

      const logError = (
        label: string,
        error: { message?: string; details?: string; hint?: string } | null | undefined,
      ) => {
        if (!error) return;
        diagnostics.push(
          `${label}: ${error.message ?? 'Unknown error'}${error.details ? ` | details: ${error.details}` : ''}${error.hint ? ` | hint: ${error.hint}` : ''}`,
        );
      };

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      logError('auth.getUser', authError);

      if (!user) {
        if (diagnostics.length > 0) {
          console.error('Dashboard diagnostics:', diagnostics);
          setDebugLines(diagnostics);
        }
        router.push('/auth/login');
        return;
      }

      setUserId(user.id);

      const [profileResult, conceptsResult, masteryResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('concepts')
          .select('id, name, description, subject_id, subjects:subject_id(name)'),
        supabase
          .from('user_concept_mastery')
          .select('concept_id, mastery_level, status')
          .eq('user_id', user.id),
      ]);

      const profile = profileResult.data;
      let conceptRows = conceptsResult.data ?? [];
      const masteryRows = masteryResult.data ?? [];

      logError('profiles.select', profileResult.error);
      logError('concepts.select_with_subject_join', conceptsResult.error);
      logError('user_concept_mastery.select', masteryResult.error);

      if ((conceptsResult.error || conceptRows.length === 0)) {
        const { data: fallbackConceptRows, error: fallbackConceptsError } = await supabase
          .from('concepts')
          .select('id, name, description, subject_id');

        logError('concepts.fallback_select', fallbackConceptsError);

        if (fallbackConceptRows && fallbackConceptRows.length > 0) {
          const subjectIds = Array.from(
            new Set(
              fallbackConceptRows
                .map((row) => row.subject_id)
                .filter((id): id is string => !!id),
            ),
          );

          let subjectNameById = new Map<string, string>();
          if (subjectIds.length > 0) {
            const { data: subjectsData, error: subjectsError } = await supabase
              .from('subjects')
              .select('id, name')
              .in('id', subjectIds);

            logError('subjects.select', subjectsError);

            subjectNameById = new Map((subjectsData ?? []).map((subject) => [subject.id, subject.name]));
          }

          conceptRows = fallbackConceptRows.map((row) => ({
            ...row,
            subjects: row.subject_id ? [{ name: subjectNameById.get(row.subject_id) ?? 'Physics' }] : [],
          }));
        }
      }

      const masteryByConcept = new Map(
        masteryRows.map((row) => [row.concept_id, row]),
      );

      const concepts: Concept[] = conceptRows.map((row) => {
        const mastery = masteryByConcept.get(row.id);
        const level = toAccuracyUnit(mastery?.mastery_level ?? 0);
        const subjectName = getSubjectName(row.subjects);

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

      setDisplayName(
        profile?.first_name
          ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
          : 'Learner',
      );
      setMappedConcepts(concepts);

      const [pathResponse, hindsightResponse] = await Promise.all([
        fetch('/api/learning-path', { method: 'GET' }),
        fetch('/api/hindsight', { method: 'GET' }),
      ]);

      const pathData = await pathResponse.json().catch(() => ({}));
      const hindsightData = await hindsightResponse.json().catch(() => ({}));

      if (pathResponse.ok) {
        setActivePath(pathData.active_path ?? null);
      }

      if (hindsightResponse.ok) {
        setRecurringMistakes(hindsightData.failure_count_per_concept ?? []);
      }

      if (concepts.length === 0) {
        diagnostics.push('dashboard: concept list resolved to 0 rows after all fallbacks.');
      }
      if (diagnostics.length > 0) {
        console.error('Dashboard diagnostics:', diagnostics);
      }
      setDebugLines(diagnostics);
      setIsLoading(false);
    };

    void loadDashboardData();
  }, [router]);

  const weakConcepts = useMemo(
    () =>
      mappedConcepts.filter(
        (concept) => concept.status === 'weak' || concept.status === 'missing',
      ),
    [mappedConcepts],
  );

  const suggestedConcept = useMemo(
    () =>
      weakConcepts.length > 0
        ? [...weakConcepts].sort(
            (a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0),
          )[0]
        : null,
    [weakConcepts],
  );

  const stats = useMemo(() => {
    const total = mappedConcepts.length;
    const mastered = mappedConcepts.filter((concept) => concept.status === 'mastered').length;
    const weak = mappedConcepts.filter((concept) => concept.status === 'weak').length;
    const missing = mappedConcepts.filter((concept) => concept.status === 'missing').length;
    const avgAccuracy =
      total > 0
        ? mappedConcepts.reduce((sum, concept) => sum + (concept.accuracy ?? 0), 0) / total
        : 0;

    return {
      total,
      mastered,
      weak,
      missing,
      avgAccuracy,
      masteredPercent: total > 0 ? Math.round((mastered / total) * 100) : 0,
      weakPercent: total > 0 ? Math.round((weak / total) * 100) : 0,
      missingPercent: total > 0 ? Math.round((missing / total) * 100) : 0,
    };
  }, [mappedConcepts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading dashboard data...
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {userId ? (
        <RealtimePageRefresh
          userId={userId}
          tables={['user_concept_mastery', 'question_attempts', 'practice_sessions']}
        />
      ) : null}
      <Navbar />
      
      <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
        {/* Welcome Section */}
        <section className="mb-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back, {displayName}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Continue your learning journey and improve your concept mastery
              </p>
            </div>
            <Link href="/practice">
              <Button size="lg" className="gap-2 mt-4 sm:mt-0">
                <BookOpen className="h-5 w-5" />
                Start Practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Overall Accuracy"
            value={`${Math.round(stats.avgAccuracy * 100)}%`}
            icon={Target}
            trend={{ value: 5, label: 'vs last week' }}
            variant="default"
          />
          <StatCard
            title="Concepts Mastered"
            value={stats.mastered}
            subtitle={`of ${stats.total}`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Weak Areas"
            value={stats.weak}
            subtitle="need attention"
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="Missing Concepts"
            value={stats.missing}
            subtitle="to learn"
            icon={Brain}
            variant="destructive"
          />
        </section>

        {debugLines.length > 0 ? (
          <section className="mb-8">
            <Card className="border-[#F59E0B]/40 bg-[#F59E0B]/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#B45309]">Dashboard Query Diagnostics</CardTitle>
                <CardDescription>
                  Temporary debug output for runtime query issues. Remove after verification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {debugLines.map((line, index) => (
                    <li key={`${index}-${line}`} className="wrap-break-word">
                      {line}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weak Concepts - Takes 2 columns */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Weak Areas</h2>
                <p className="text-sm text-muted-foreground">
                  Focus on these concepts to improve your understanding
                </p>
              </div>
              <Link href="/knowledge-map">
                <Button variant="outline" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {weakConcepts.slice(0, 4).map((concept) => (
                <ConceptCard key={concept.id} concept={concept} />
              ))}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Active Learning Path</CardTitle>
                </div>
                <CardDescription>
                  Continue your structured recovery journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activePath?.path && activePath.path.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {activePath.path.slice(0, 3).map((step, index) => (
                        <div key={`${step.concept_name ?? 'concept'}-${index}`} className="rounded-md border border-border px-3 py-2 text-sm">
                          {index + 1}. {step.concept_name ?? 'Concept'}
                        </div>
                      ))}
                    </div>
                    <Link href={activePath.root_concept_id ? `/recovery?concept=${activePath.root_concept_id}` : '/recovery'}>
                      <Button className="w-full gap-2">
                        Continue Recovery
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No active recovery plan yet. Complete a practice session to generate one.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-[#F59E0B]" />
                  <CardTitle className="text-base">Recurring Mistakes</CardTitle>
                </div>
                <CardDescription>
                  Concepts where you fail most often.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recurringMistakes.length > 0 ? (
                  recurringMistakes.slice(0, 4).map((item) => (
                    <div key={item.conceptId} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="truncate pr-2">{item.conceptName}</span>
                      <span className="text-muted-foreground">{item.count} misses</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recurring mistakes identified yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Suggested Next Topic */}
            {suggestedConcept && (
              <Card className="border-primary/20 bg-accent/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                      <Lightbulb className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-base">Suggested Next</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{suggestedConcept.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {suggestedConcept.description}
                    </p>
                  </div>
                  <Link href={`/practice?concept=${suggestedConcept.id}`}>
                    <Button className="w-full gap-2">
                      <Sparkles className="h-4 w-4" />
                      Start Learning
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Progress Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chapter Progress</CardTitle>
                <CardDescription>Force & Laws of Motion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#22C55E]" />
                      <span className="text-muted-foreground">Mastered</span>
                    </div>
                    <span className="font-medium">{stats.masteredPercent}%</span>
                  </div>
                  <Progress value={stats.masteredPercent} className="h-2 [&>div]:bg-[#22C55E]" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                      <span className="text-muted-foreground">Weak</span>
                    </div>
                    <span className="font-medium">{stats.weakPercent}%</span>
                  </div>
                  <Progress value={stats.weakPercent} className="h-2 [&>div]:bg-[#F59E0B]" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                      <span className="text-muted-foreground">Missing</span>
                    </div>
                    <span className="font-medium">{stats.missingPercent}%</span>
                  </div>
                  <Progress value={stats.missingPercent} className="h-2 [&>div]:bg-[#EF4444]" />
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant Promo */}
            <Card className="bg-linear-to-br from-primary/5 via-secondary/5 to-primary/10 border-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">AI Study Companion</h3>
                    <p className="text-sm text-muted-foreground">
                      Get personalized explanations and study guidance from our AI assistant.
                    </p>
                    <Link href="/practice">
                      <Button variant="secondary" size="sm" className="mt-2">
                        Try it now
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
