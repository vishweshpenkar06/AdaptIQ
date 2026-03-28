import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runRecoveryStep, updateMastery } from '@/lib/recovery/engine';
import { reflectLearningGuidance } from '@/lib/hindsight/client';
import { buildAIContext } from '@/lib/ai/context-builder';
import { getRecoveryPrompt } from '@/lib/ai/prompts';
import { generateAIResponse } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const conceptId = (payload as { concept_id?: string })?.concept_id;
  if (!conceptId) {
    return NextResponse.json({ error: 'concept_id is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const recovery = await runRecoveryStep(user.id, conceptId);

    const context = await buildAIContext({
      userId: user.id,
      conceptId,
      mistakeType: 'recovery',
    });

    let aiExplanation: string | null = null;
    try {
      aiExplanation = await generateAIResponse(getRecoveryPrompt(context), {
        promptType: 'recovery',
        cacheKey: `${user.id}:${conceptId}:recovery`,
        maxSentences: 5,
      });
    } catch {
      aiExplanation = null;
    }

    return NextResponse.json({
      ...recovery,
      explanation: aiExplanation ?? recovery.explanation,
      ai_explanation: aiExplanation,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not run recovery step.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const conceptId = (payload as { concept_id?: string })?.concept_id;
  const pathId = (payload as { path_id?: string })?.path_id;
  const performance = Number((payload as { performance?: number })?.performance);

  if (!conceptId || Number.isNaN(performance)) {
    return NextResponse.json({ error: 'concept_id and performance are required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const updated = await updateMastery(user.id, conceptId, performance);

    await supabase
      .from('hindsight_events')
      .update({ resolved: true })
      .eq('user_id', user.id)
      .eq('root_concept_id', conceptId)
      .eq('resolved', false);

    let pathStatus: 'active' | 'in_progress' | 'completed' | null = null;
    if (pathId) {
      await supabase
        .from('learning_path_items')
        .update({ completed_at: new Date().toISOString() })
        .eq('path_id', pathId)
        .eq('concept_id', conceptId)
        .is('completed_at', null);

      const { count: remaining, error: remainingError } = await supabase
        .from('learning_path_items')
        .select('id', { count: 'exact', head: true })
        .eq('path_id', pathId)
        .is('completed_at', null);

      if (!remainingError) {
        pathStatus = (remaining ?? 0) === 0 ? 'completed' : 'in_progress';

        await supabase
          .from('learning_paths')
          .update({ status: pathStatus })
          .eq('id', pathId)
          .eq('user_id', user.id);
      }
    }

    const reflection = await reflectLearningGuidance(
      user.id,
      `The learner just completed a recovery step for concept ${conceptId} with performance ${performance.toFixed(2)}. Suggest one concise next focus area.`,
    );

    return NextResponse.json({ updated, path_status: pathStatus, reflection });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update mastery.' },
      { status: 500 },
    );
  }
}