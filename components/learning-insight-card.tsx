'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LearningInsightCardProps {
  conceptName?: string;
  mistakeCount?: number;
  className?: string;
  showBadge?: boolean;
}

export function LearningInsightCard({
  conceptName,
  mistakeCount,
  className,
  showBadge = true,
}: LearningInsightCardProps) {
  const hasInsight =
    Boolean(conceptName)
    && typeof mistakeCount === 'number'
    && Number.isFinite(mistakeCount)
    && mistakeCount > 0;

  return (
    <Card
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 py-0 shadow-sm transition-colors',
        'hover:bg-card',
        className,
      )}
    >
      <CardHeader className="space-y-2 p-4 pb-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold text-foreground">
            <span className="mr-2" aria-hidden="true">
              🧠
            </span>
            Learning Insight
          </CardTitle>

          {showBadge ? (
            <Badge variant="outline" className="text-[11px] text-muted-foreground">
              Based on recent activity
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        {hasInsight ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            From your recent attempts,{' '}
            <span className="font-semibold text-foreground">{conceptName}</span>{' '}
            appeared in{' '}
            <span className="font-semibold text-foreground">{mistakeCount}</span>{' '}
            mistakes.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No insights yet. Start practicing to see your learning patterns.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
