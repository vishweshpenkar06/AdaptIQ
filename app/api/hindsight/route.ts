import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHindsightSummary } from '@/lib/hindsight/service';
import { buildAIContext } from '@/lib/ai/context-builder';
import { getPatternPrompt } from '@/lib/ai/prompts';
import { generateAIResponse } from '@/lib/ai/service';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const summary = await getHindsightSummary(user.id);

    const topConceptId = summary.failure_count_per_concept?.[0]?.conceptId;
    let patternInsight: string | null = null;

    try {
      const context = await buildAIContext({
        userId: user.id,
        conceptId: topConceptId,
        mistakeType: 'pattern',
      });

      patternInsight = await generateAIResponse(getPatternPrompt(context), {
        promptType: 'pattern',
        cacheKey: `${user.id}:${topConceptId ?? 'general'}:pattern`,
        maxSentences: 3,
      });
    } catch {
      patternInsight = null;
    }

    return NextResponse.json({
      ...summary,
      pattern_insight: patternInsight,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load hindsight summary.' },
      { status: 500 },
    );
  }
}