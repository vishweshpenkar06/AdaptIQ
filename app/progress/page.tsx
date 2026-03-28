'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { StatCard } from '@/components/stat-card';
import { ConceptBadge } from '@/components/concept-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { toAccuracyUnit, toConceptStatus } from '@/lib/mastery-utils';
import type { Concept } from '@/lib/types';
import { 
  Target, 
  TrendingUp, 
  Calendar,
  Clock,
  Trophy,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { useRouter } from 'next/navigation';

export default function ProgressPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [accuracyOverTime, setAccuracyOverTime] = useState<{ day: string; accuracy: number }[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);
  const [hoursThisWeek, setHoursThisWeek] = useState(0);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadProgressData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUserId(user.id);

      const [conceptsResult, masteryResult, attemptsResult] = await Promise.all([
        supabase
          .from('concepts')
          .select('id, name, description, subjects:subject_id(name)'),
        supabase
          .from('user_concept_mastery')
          .select('concept_id, mastery_level, status')
          .eq('user_id', user.id),
        supabase
          .from('question_attempts')
          .select('is_correct, created_at, time_taken_seconds')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
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

      const attempts = attemptsResult.data ?? [];
      const recent7 = new Date();
      recent7.setDate(recent7.getDate() - 6);

      const dayMap = new Map<string, { total: number; correct: number }>();
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayMap.set(d.toDateString(), { total: 0, correct: 0 });
      }

      attempts.forEach((attempt) => {
        const day = new Date(attempt.created_at).toDateString();
        if (!dayMap.has(day)) return;

        const entry = dayMap.get(day)!;
        entry.total += 1;
        if (attempt.is_correct) entry.correct += 1;
      });

      const trend = Array.from(dayMap.entries()).map(([day, entry]) => ({
        day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        accuracy: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0,
      }));

      const uniqueDays = Array.from(
        new Set(attempts.map((attempt) => new Date(attempt.created_at).toDateString())),
      ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let streak = 0;
      for (let i = 0; i < uniqueDays.length; i += 1) {
        const expected = new Date();
        expected.setHours(0, 0, 0, 0);
        expected.setDate(expected.getDate() - i);
        if (new Date(uniqueDays[i]).toDateString() !== expected.toDateString()) break;
        streak += 1;
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const timeSeconds = attempts
        .filter((attempt) => new Date(attempt.created_at) >= weekStart)
        .reduce((sum, attempt) => sum + (attempt.time_taken_seconds ?? 0), 0);

      setConcepts(mappedConcepts);
      setAccuracyOverTime(trend);
      setQuestionsAnswered(attempts.length);
      setStudyStreak(streak);
      setHoursThisWeek(Number((timeSeconds / 3600).toFixed(1)));
      setIsLoading(false);
    };

    void loadProgressData();
  }, [router, reloadKey]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`progress-live:${userId}`);
    const scheduleReload = () => {
      if (reloadTimeoutRef.current) return;
      reloadTimeoutRef.current = setTimeout(() => {
        reloadTimeoutRef.current = null;
        setReloadKey((prev) => prev + 1);
      }, 500);
    };

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'question_attempts',
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_concept_mastery',
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload,
      )
      .subscribe();

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const stats = useMemo(() => {
    const total = concepts.length;
    const mastered = concepts.filter((concept) => concept.status === 'mastered').length;
    const weak = concepts.filter((concept) => concept.status === 'weak').length;
    const missing = concepts.filter((concept) => concept.status === 'missing').length;
    const avgAccuracy =
      total > 0
        ? concepts.reduce((sum, concept) => sum + (concept.accuracy ?? 0), 0) / total
        : 0;

    return {
      total,
      mastered,
      weak,
      missing,
      avgAccuracy,
    };
  }, [concepts]);

  const conceptMastery = useMemo(
    () =>
      concepts.map((concept) => ({
        name: concept.name.length > 12 ? `${concept.name.substring(0, 10)}...` : concept.name,
        fullName: concept.name,
        accuracy: Math.round((concept.accuracy || 0) * 100),
        status: concept.status,
      })),
    [concepts],
  );

  const insights = useMemo(() => {
    const currentAccuracy = Math.round(stats.avgAccuracy * 100);
    const weakest = [...concepts].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0];

    return [
      {
        type: 'improvement' as const,
        title: 'Current accuracy',
        description: `Your overall accuracy is ${currentAccuracy}% based on real attempts and mastery data.`,
        trend: 'up' as const,
        value: `${currentAccuracy}%`,
      },
      {
        type: 'focus' as const,
        title: 'Focus needed',
        description: weakest
          ? `${weakest.name} is currently your weakest concept. Practice it next for faster improvement.`
          : 'Keep answering questions to reveal your weak concepts.',
        trend: 'down' as const,
        value: weakest ? `${Math.round((weakest.accuracy ?? 0) * 100)}%` : '0%',
      },
      {
        type: 'achievement' as const,
        title: 'Milestone reached',
        description: `You have mastered ${stats.mastered} out of ${stats.total} concepts so far.`,
        trend: 'up' as const,
        value: stats.total > 0 ? `${Math.round((stats.mastered / stats.total) * 100)}%` : '0%',
      },
    ];
  }, [concepts, stats.avgAccuracy, stats.mastered, stats.total]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading progress data...
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const masteryData = [
    { name: 'Mastered', value: stats.mastered, color: '#22C55E' },
    { name: 'Weak', value: stats.weak, color: '#F59E0B' },
    { name: 'Missing', value: stats.missing, color: '#EF4444' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-300 px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Progress
          </h1>
          <p className="text-muted-foreground">
            Track your learning journey with real-time database-backed metrics
          </p>
        </div>

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
            title="Questions Answered"
            value={questionsAnswered}
            subtitle="this month"
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Study Streak"
            value={studyStreak}
            subtitle="days"
            icon={Calendar}
            variant="warning"
          />
          <StatCard
            title="Time Spent"
            value={hoursThisWeek}
            subtitle="hours this week"
            icon={Clock}
            variant="default"
          />
        </section>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Accuracy Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accuracy Over Time</CardTitle>
              <CardDescription>Your performance this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#64748B"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#64748B"
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Accuracy']}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Concept Mastery Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mastery Distribution</CardTitle>
              <CardDescription>Breakdown of your concept progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-75 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={masteryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {masteryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={36}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Concept Accuracy Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Concept Accuracy Breakdown</CardTitle>
            <CardDescription>Your accuracy level for each concept</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={conceptMastery}
                  layout="vertical"
                  margin={{ left: 10, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    stroke="#64748B"
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748B"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: { payload: typeof conceptMastery[0] }) => [
                      `${value}%`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {conceptMastery.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.status === 'mastered' ? '#22C55E' :
                          entry.status === 'weak' ? '#F59E0B' :
                          '#EF4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Insights and Concept List */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Insights */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Learning Insights</h2>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Card 
                  key={index}
                  className={
                    insight.type === 'improvement' ? 'border-[#22C55E]/30 bg-[#22C55E]/5' :
                    insight.type === 'focus' ? 'border-[#F59E0B]/30 bg-[#F59E0B]/5' :
                    'border-primary/30 bg-primary/5'
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        insight.type === 'improvement' ? 'bg-[#22C55E]' :
                        insight.type === 'focus' ? 'bg-[#F59E0B]' :
                        'bg-primary'
                      }`}>
                        {insight.type === 'improvement' ? (
                          <TrendingUp className="h-5 w-5 text-white" />
                        ) : insight.type === 'focus' ? (
                          <Target className="h-5 w-5 text-white" />
                        ) : (
                          <Trophy className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {insight.title}
                          </h3>
                          <Badge 
                            variant="outline"
                            className={
                              insight.trend === 'up' 
                                ? 'text-[#22C55E] border-[#22C55E]/30' 
                                : 'text-[#EF4444] border-[#EF4444]/30'
                            }
                          >
                            <span className="flex items-center gap-1">
                              {insight.trend === 'up' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                              {insight.value}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Concept Progress List */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground mb-4">All Concepts</h2>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {concepts.map((concept) => {
                    const accuracy = Math.round((concept.accuracy || 0) * 100);
                    return (
                      <div 
                        key={concept.id}
                        className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-foreground truncate">
                              {concept.name}
                            </h3>
                            <ConceptBadge status={concept.status || 'missing'} />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Progress 
                                value={accuracy} 
                                className={`h-2 ${
                                  concept.status === 'mastered' ? '[&>div]:bg-[#22C55E]' :
                                  concept.status === 'weak' ? '[&>div]:bg-[#F59E0B]' :
                                  '[&>div]:bg-[#EF4444]'
                                }`}
                              />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                              {accuracy}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
