'use client';

import { useState } from 'react';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isSelectedAnswerCorrect, resolveCanonicalCorrectAnswer } from '@/lib/answer-utils';
import { CheckCircle2, XCircle, ArrowRight, Lightbulb } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (payload: { isCorrect: boolean; selectedAnswer: string; timeTakenSeconds: number }) => void;
  onNext: () => void;
  isSaving?: boolean;
}

export function QuestionCard({ 
  question, 
  questionNumber, 
  totalQuestions,
  onAnswer,
  onNext,
  isSaving = false,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const canonicalCorrectAnswer = resolveCanonicalCorrectAnswer(question);

  const isCorrect = !!selectedAnswer && isSelectedAnswerCorrect(question, selectedAnswer);

  const handleSubmit = () => {
    if (selectedAnswer && !isSaving) {
      setSubmitted(true);
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      onAnswer({ isCorrect, selectedAnswer, timeTakenSeconds: elapsed });
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setSubmitted(false);
    setStartedAt(Date.now());
    onNext();
  };

  const difficultyColors = {
    easy: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20',
    medium: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
    hard: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Question {questionNumber} of {totalQuestions}
            </span>
            <Badge variant="outline" className={difficultyColors[question.difficulty]}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pb-3">
        <div className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold leading-relaxed text-foreground">
              {question.questionText}
            </CardTitle>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === canonicalCorrectAnswer;
              
              let optionClass = 'border-border hover:border-primary/50 hover:bg-accent/50';
              
              if (submitted) {
                if (isCorrectOption) {
                  optionClass = 'border-[#22C55E] bg-[#22C55E]/10 text-foreground';
                } else if (isSelected && !isCorrectOption) {
                  optionClass = 'border-[#EF4444] bg-[#EF4444]/10 text-foreground';
                } else {
                  optionClass = 'border-border opacity-50';
                }
              } else if (isSelected) {
                optionClass = 'border-primary bg-primary/5 ring-2 ring-primary/20';
              }

              return (
                <button
                  key={index}
                  type="button"
                  disabled={submitted || isSaving}
                  onClick={() => setSelectedAnswer(option)}
                  className={cn(
                    'w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all',
                    optionClass,
                    !submitted && 'cursor-pointer'
                  )}
                >
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    submitted && isCorrectOption ? 'bg-[#22C55E] text-white' :
                    submitted && isSelected && !isCorrectOption ? 'bg-[#EF4444] text-white' :
                    isSelected ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {submitted && isCorrectOption ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : submitted && isSelected && !isCorrectOption ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      letter
                    )}
                  </span>
                  <span className="text-sm font-medium">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation (shown after submit) */}
          {submitted && (
            <div className={cn(
              'rounded-lg border-2 p-4',
              isCorrect ? 'border-[#22C55E]/30 bg-[#22C55E]/5' : 'border-[#F59E0B]/30 bg-[#F59E0B]/5'
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  isCorrect ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'
                )}>
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className={cn(
                    'font-semibold',
                    isCorrect ? 'text-[#22C55E]' : 'text-[#F59E0B]'
                  )}>
                    {isCorrect ? 'Correct!' : 'Not quite right'}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-xs">
            <div className="flex items-center justify-end gap-3">
              {!submitted ? (
                <Button
                  size="lg"
                  disabled={!selectedAnswer || isSaving}
                  onClick={handleSubmit}
                >
                  {isSaving ? 'Saving...' : 'Submit Answer'}
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="gap-2"
                >
                  Next Question
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
