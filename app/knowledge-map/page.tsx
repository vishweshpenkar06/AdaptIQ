'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { ConceptBadge } from '@/components/concept-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { toAccuracyUnit, toConceptStatus } from '@/lib/mastery-utils';
import type { Concept } from '@/lib/types';
import { 
  Network, 
  List, 
  BookOpen, 
  ArrowRight, 
  GitBranch, 
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function KnowledgeMapPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptDependencies, setConceptDependencies] = useState<
    { parentConceptId: string; childConceptId: string }[]
  >([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  useEffect(() => {
    const loadKnowledgeData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const [conceptsResult, masteryResult, dependenciesResult] = await Promise.all([
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

      const mappedDependencies = (dependenciesResult.data ?? []).map((row) => ({
        parentConceptId: row.prerequisite_id,
        childConceptId: row.concept_id,
      }));

      setConcepts(mappedConcepts);
      setConceptDependencies(mappedDependencies);
      setIsLoading(false);
    };

    void loadKnowledgeData();
  }, [router]);

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

  // Transform dependencies for the graph component
  const graphDependencies = conceptDependencies.map((dep) => ({
    parentId: dep.parentConceptId,
    childId: dep.childConceptId,
  }));

  // Get prerequisites and dependents for selected concept
  const getPrerequisites = (conceptId: string) => {
    return conceptDependencies
      .filter((d) => d.childConceptId === conceptId)
      .map((d) => concepts.find((c) => c.id === d.parentConceptId))
      .filter((c): c is Concept => c !== undefined);
  };

  const getDependents = (conceptId: string) => {
    return conceptDependencies
      .filter((d) => d.parentConceptId === conceptId)
      .map((d) => concepts.find((c) => c.id === d.childConceptId))
      .filter((c): c is Concept => c !== undefined);
  };

  const prerequisites = selectedConcept ? getPrerequisites(selectedConcept.id) : [];
  const dependents = selectedConcept ? getDependents(selectedConcept.id) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-350 px-4 py-8 lg:px-8">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading knowledge map...
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-350 px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Knowledge Map
            </h1>
            <p className="text-muted-foreground">
              Visualize concept dependencies and your learning progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
              <span className="text-muted-foreground">{stats.mastered} Mastered</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
              <span className="text-muted-foreground">{stats.weak} Weak</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-[#EF4444]" />
              <span className="text-muted-foreground">{stats.missing} Missing</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Graph View */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="graph" className="space-y-4">
              <TabsList>
                <TabsTrigger value="graph" className="gap-2">
                  <Network className="h-4 w-4" />
                  Graph View
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="graph" className="mt-0">
                <div className="h-125 lg:h-150">
                  <KnowledgeGraph
                    concepts={concepts}
                    dependencies={graphDependencies}
                    onSelectConcept={setSelectedConcept}
                    selectedConceptId={selectedConcept?.id}
                  />
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">All Concepts</CardTitle>
                    <CardDescription>
                      Click on any concept to see details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-125 pr-4">
                      <div className="space-y-2">
                        {concepts.map((concept) => {
                          const accuracy = Math.round((concept.accuracy || 0) * 100);
                          return (
                            <button
                              key={concept.id}
                              onClick={() => setSelectedConcept(concept)}
                              className={`w-full flex items-center justify-between gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50 ${
                                selectedConcept?.id === concept.id 
                                  ? 'border-primary bg-primary/5' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`h-3 w-3 rounded-full ${
                                  concept.status === 'mastered' ? 'bg-[#22C55E]' :
                                  concept.status === 'weak' ? 'bg-[#F59E0B]' :
                                  'bg-[#EF4444]'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {concept.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {concept.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-foreground">
                                    {accuracy}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Accuracy
                                  </p>
                                </div>
                                <ConceptBadge status={concept.status || 'missing'} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Concept Details Sidebar */}
          <aside className="space-y-4">
            {selectedConcept ? (
              <>
                {/* Selected Concept Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{selectedConcept.name}</CardTitle>
                        <CardDescription>{selectedConcept.chapter}</CardDescription>
                      </div>
                      <ConceptBadge status={selectedConcept.status || 'missing'} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedConcept.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-medium text-foreground">
                          {Math.round((selectedConcept.accuracy || 0) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.round((selectedConcept.accuracy || 0) * 100)} 
                        className="h-2"
                      />
                    </div>

                    <Link href={`/practice?concept=${selectedConcept.id}`}>
                      <Button className="w-full gap-2">
                        <BookOpen className="h-4 w-4" />
                        Practice This Concept
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Prerequisites */}
                {prerequisites.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Prerequisites</CardTitle>
                      </div>
                      <CardDescription>
                        Concepts you need to understand first
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {prerequisites.map((concept) => (
                          <button
                            key={concept.id}
                            onClick={() => setSelectedConcept(concept)}
                            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                concept.status === 'mastered' ? 'bg-[#22C55E]' :
                                concept.status === 'weak' ? 'bg-[#F59E0B]' :
                                'bg-[#EF4444]'
                              }`} />
                              <span className="text-sm font-medium text-foreground">
                                {concept.name}
                              </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Dependents */}
                {dependents.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Unlocks</CardTitle>
                      </div>
                      <CardDescription>
                        Concepts that depend on this
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dependents.map((concept) => (
                          <button
                            key={concept.id}
                            onClick={() => setSelectedConcept(concept)}
                            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                concept.status === 'mastered' ? 'bg-[#22C55E]' :
                                concept.status === 'weak' ? 'bg-[#F59E0B]' :
                                'bg-[#EF4444]'
                              }`} />
                              <span className="text-sm font-medium text-foreground">
                                {concept.name}
                              </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                    <Network className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Select a Concept
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-50">
                    Click on any node in the graph to see concept details and dependencies
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
