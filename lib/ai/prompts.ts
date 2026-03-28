import type { AIContext } from '@/lib/ai/context-builder';

function formatMastery(mastery: AIContext['mastery']) {
  const entries = Object.entries(mastery);
  if (entries.length === 0) return 'No mastery data available';
  return entries
    .map(([concept, score]) => `${concept}: ${(score * 100).toFixed(0)}%`)
    .join(', ');
}

function formatList(items: string[], emptyLabel: string) {
  if (items.length === 0) return emptyLabel;
  return items.join(', ');
}

export function getExplanationPrompt(context: AIContext) {
  return [
    `You are a friendly science tutor for a ${context.student_level} student.`,
    '',
    'Context:',
    `- Concept: ${context.concept}`,
    `- Weak prerequisite: ${formatList(context.dependencies, 'None')}`,
    `- Student mastery: ${formatMastery(context.mastery)}`,
    `- Past mistakes: ${formatList(context.past_mistakes, 'None')}`,
    '',
    'Task:',
    'Explain the concept in a very simple way.',
    '- Use 1 real-life example',
    '- Keep it short (max 5 sentences)',
    '- Focus on fixing the weak prerequisite',
    '',
    'Rules:',
    '- Do NOT introduce advanced topics',
    '- Only use the concepts provided',
    '- Do not introduce new topics',
  ].join('\n');
}

export function getDiagnosisPrompt(context: AIContext) {
  return [
    'You are an AI tutor.',
    '',
    'The student answered incorrectly.',
    '',
    'Context:',
    `- Question: ${context.question || 'Not provided'}`,
    `- Root cause: ${context.concept}`,
    `- Dependency chain: ${formatList(context.dependencies, 'None')}`,
    `- Student weakness: ${formatMastery(context.mastery)}`,
    '',
    'Task:',
    'Explain WHY the student likely got this wrong.',
    '- Mention the missing concept',
    '- Keep it simple (3–4 lines)',
    '',
    'Rules:',
    '- Do NOT introduce new concepts',
    '- Be specific, not generic',
    '- Only use the provided concepts.',
    '- Do not introduce new topics.',
  ].join('\n');
}

export function getRecoveryPrompt(context: AIContext) {
  return [
    'You are guiding a student through a recovery plan.',
    '',
    'Context:',
    `- Current concept: ${context.concept}`,
    `- Weak prerequisite: ${formatList(context.dependencies, 'None')}`,
    `- Student level: ${context.student_level}`,
    '',
    'Task:',
    'Explain what the student should focus on right now.',
    '- Give 1 tip',
    '- Give 1 example',
    '- Keep it actionable and short (max 5 sentences)',
    '',
    'Rules:',
    '- Do NOT go beyond the provided concepts',
    '- Only use the provided concepts.',
    '- Do not introduce new topics.',
  ].join('\n');
}

export function getPatternPrompt(context: AIContext) {
  return [
    'You are analyzing a student\'s learning behavior.',
    '',
    'Context:',
    `- Past mistakes: ${formatList(context.past_mistakes, 'None')}`,
    '',
    'Task:',
    'Identify the pattern in mistakes.',
    '- Keep it 2–3 lines',
    '- Suggest what the student should improve',
    '',
    'Rules:',
    '- Be concise',
    '- Do not generalize beyond given data',
    '- Only use the provided concepts.',
    '- Do not introduce new topics.',
  ].join('\n');
}
