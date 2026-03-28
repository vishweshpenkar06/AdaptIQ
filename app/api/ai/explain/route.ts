import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAIContext } from '@/lib/ai/context-builder';
import { getExplanationPrompt } from '@/lib/ai/prompts';
import { generateAIResponse } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const questionId = (payload as { question_id?: string })?.question_id;
  const conceptId = (payload as { concept_id?: string })?.concept_id;

  if (!questionId && !conceptId) {
    return NextResponse.json({ error: 'question_id or concept_id is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const context = await buildAIContext({
      userId: user.id,
      questionId,
      conceptId,
      mistakeType: 'explain',
    });

    const explanation = await generateAIResponse(getExplanationPrompt(context), {
      promptType: 'explanation',
      cacheKey: `${user.id}:${conceptId ?? 'from-question'}:explanation:${questionId ?? 'none'}`,
      maxSentences: 5,
    });

    return NextResponse.json({ explanation, context });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not generate explanation.' },
      { status: 500 },
    );
  }
}
