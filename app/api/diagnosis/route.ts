import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { diagnose } from '@/lib/diagnosis/engine';
import { storeHindsightEvent } from '@/lib/hindsight/service';
import { generateLearningPath } from '@/lib/learning-path/generator';
import { buildAIContext } from '@/lib/ai/context-builder';
import { getDiagnosisPrompt } from '@/lib/ai/prompts';
import { generateAIResponse } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const questionId = (payload as { question_id?: string })?.question_id;
  if (!questionId) {
    return NextResponse.json({ error: 'question_id is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const diagnosis = await diagnose(user.id, questionId);

    const context = await buildAIContext({
      userId: user.id,
      questionId,
      conceptId: diagnosis.root_cause.id,
      mistakeType: 'wrong_answer',
    });

    let aiExplanation: string | null = null;
    try {
      aiExplanation = await generateAIResponse(getDiagnosisPrompt(context), {
        promptType: 'diagnosis',
        cacheKey: `${user.id}:${diagnosis.root_cause.id}:diagnosis:${questionId}`,
        maxSentences: 4,
      });
    } catch {
      aiExplanation = null;
    }

    await storeHindsightEvent({
      userId: user.id,
      questionId,
      rootConceptId: diagnosis.root_cause.id,
      dependencyChain: diagnosis.dependency_chain,
      mistakeType: 'wrong_answer',
    });

    const learningPath = await generateLearningPath(user.id, diagnosis.root_cause.id);

    return NextResponse.json({ diagnosis, learning_path: learningPath, ai_explanation: aiExplanation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Diagnosis failed.' },
      { status: 500 },
    );
  }
}