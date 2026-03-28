'use client';

import type { Concept } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConceptBadge } from './concept-badge';
import { AlertTriangle, ArrowRight, GitBranch, Lightbulb, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface DiagnosisPanelProps {
  missingConcept: Concept;
  dependencyChain: Concept[];
  suggestion: string;
  rootCauseName?: string;
}

export function DiagnosisPanel({ missingConcept, dependencyChain, suggestion, rootCauseName }: DiagnosisPanelProps) {
  return (
    <Card className="border-[#F59E0B]/30 bg-[#F59E0B]/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base text-foreground">Root Cause Analysis</CardTitle>
            <p className="text-sm text-muted-foreground">
              Why you might have missed this question
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Missing Concept */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EF4444]/10">
              <Lightbulb className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">Missing Concept</h4>
                <ConceptBadge status={missingConcept.status || 'missing'} />
              </div>
              <p className="text-sm font-medium text-foreground">{missingConcept.name}</p>
              <p className="text-sm text-muted-foreground">{missingConcept.description}</p>
            </div>
          </div>
        </div>

        {/* Dependency Chain */}
        {dependencyChain.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <GitBranch className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-foreground">Prerequisite Concepts</h4>
                <div className="flex flex-wrap gap-2">
                  {dependencyChain.map((concept, index) => (
                    <div key={concept.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {concept.name}
                      </Badge>
                      {index < dependencyChain.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold">Suggestion:</span> {suggestion}
          </p>
          {rootCauseName ? (
            <p className="mt-2 text-sm text-foreground">
              <span className="font-semibold">Likely root cause:</span> {rootCauseName}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link href={`/practice?concept=${missingConcept.id}`}>
            <Button className="w-full gap-2" variant="outline">
              <BookOpen className="h-4 w-4" />
              Practice {missingConcept.name}
            </Button>
          </Link>
          <Link href={`/recovery?concept=${missingConcept.id}`}>
            <Button className="w-full gap-2">
              <BookOpen className="h-4 w-4" />
              Start Recovery Plan
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
