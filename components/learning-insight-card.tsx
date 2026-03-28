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
        'rounded-2xl border border-border/70 bg-muted/30 py-0 shadow-sm transition-all duration-300',
        'hover:border-border hover:bg-muted/40 hover:shadow-md',
        'animate-in fade-in-0 zoom-in-[0.98]',
        className,
      )}
    >
      <CardHeader className="space-y-2 p-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
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

      <CardContent className="p-5 pt-1">
        {hasInsight ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            You&apos;ve struggled with{' '}
            <span className="font-semibold text-foreground">{conceptName}</span>{' '}
            in{' '}
            <span className="font-semibold text-foreground">{mistakeCount}</span>{' '}
            questions.
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
