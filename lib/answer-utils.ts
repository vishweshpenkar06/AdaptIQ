import type { Question } from '@/lib/types';

export function normalizeAnswer(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Supports answer keys stored as option text, A/B/C/D, 1/2/3/4, or option1/option2.
export function resolveCanonicalCorrectAnswer(question: Pick<Question, 'options' | 'correctAnswer'>) {
  const options = question.options ?? [];
  const normalizedCorrect = normalizeAnswer(question.correctAnswer);

  const directMatch = options.find((option) => normalizeAnswer(option) === normalizedCorrect);
  if (directMatch) return directMatch;

  const letterMatch = normalizedCorrect.match(/^[a-d]$/i);
  if (letterMatch) {
    const index = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return options[index];
  }

  const oneBasedNumber = Number.parseInt(normalizedCorrect, 10);
  if (Number.isFinite(oneBasedNumber) && oneBasedNumber >= 1 && oneBasedNumber <= options.length) {
    return options[oneBasedNumber - 1];
  }

  const optionNumberMatch = normalizedCorrect.match(/^option\s*(\d+)$/i);
  if (optionNumberMatch) {
    const index = Number.parseInt(optionNumberMatch[1], 10) - 1;
    if (index >= 0 && index < options.length) return options[index];
  }

  return question.correctAnswer;
}

export function isSelectedAnswerCorrect(question: Pick<Question, 'options' | 'correctAnswer'>, selectedAnswer: string) {
  const canonicalCorrect = resolveCanonicalCorrectAnswer(question);
  return normalizeAnswer(selectedAnswer) === normalizeAnswer(canonicalCorrect);
}
