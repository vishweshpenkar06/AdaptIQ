'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMessage, Question, Concept } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Brain, Send, Sparkles, User, BookOpen, HelpCircle, Lightbulb, Maximize2, Minimize2 } from 'lucide-react';

type ApiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface AIChatPanelProps {
  currentQuestion?: Question | null;
  currentConcept?: Concept | null;
  isAnswerIncorrect?: boolean;
}

const quickActions = [
  { label: 'Explain this concept', icon: BookOpen },
  { label: 'Why did I get this wrong?', icon: HelpCircle },
  { label: 'Give me a hint', icon: Lightbulb },
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text: string) {
  return text
    .replace(/`([^`]+)`/g, '<code class="rounded bg-background/60 px-1.5 py-0.5 text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1</a>');
}

function markdownToHtml(markdown: string) {
  const escaped = escapeHtml(markdown);
  const lines = escaped.split('\n');
  const html: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    html.push(`<ul class="list-disc pl-5 space-y-1">${listBuffer.join('')}</ul>`);
    listBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      html.push('<br/>');
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = renderInlineMarkdown(headingMatch[2]);
      if (level === 1) html.push(`<h1 class="mb-1 text-base font-bold">${content}</h1>`);
      else if (level === 2) html.push(`<h2 class="mb-1 text-sm font-semibold">${content}</h2>`);
      else html.push(`<h3 class="mb-1 text-sm font-semibold">${content}</h3>`);
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      listBuffer.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
      return;
    }

    flushList();
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  });

  flushList();
  return html.join('');
}

export function AIChatPanel({ currentQuestion, currentConcept, isAnswerIncorrect }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI study companion. I can help explain concepts, analyze your mistakes, and suggest what to study next. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const diagnosisForQuestionRef = useRef<string | null>(null);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      // Keep chat history bounded to avoid unbounded growth in long practice sessions.
      return next.slice(-80);
    });
  };

  const createMessageId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isFullscreen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isFullscreen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Add context-aware message when answer is incorrect
  useEffect(() => {
    if (isAnswerIncorrect && currentQuestion && diagnosisForQuestionRef.current !== currentQuestion.id) {
      diagnosisForQuestionRef.current = currentQuestion.id;
      const diagnosisMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: `I noticed you had trouble with that question about "${currentQuestion.questionText.substring(0, 50)}...". Would you like me to explain the concept in more detail, or would you prefer a different approach to understanding this topic?`,
        timestamp: new Date(),
      };
      appendMessage(diagnosisMessage);
    }

    if (!isAnswerIncorrect) {
      diagnosisForQuestionRef.current = null;
    }
  }, [isAnswerIncorrect, currentQuestion]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || isTyping) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    appendMessage(userMessage);
    setInput('');
    setIsTyping(true);

    try {
      const recentMessages: ApiChatMessage[] = messages
        .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => (
          message.role === 'user' || message.role === 'assistant'
        ))
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          messages: recentMessages,
          context: {
            conceptName: currentConcept?.name,
            questionText: currentQuestion?.questionText,
            isAnswerIncorrect: Boolean(isAnswerIncorrect),
          },
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        appendMessage({
          id: createMessageId(),
          role: 'assistant',
          content: 'I am having trouble reaching the AI service right now. Please try again in a moment.',
          timestamp: new Date(),
        });
        return;
      }

      const aiMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      appendMessage(aiMessage);
    } catch {
      appendMessage({
        id: createMessageId(),
        role: 'assistant',
        content: 'I am having trouble reaching the AI service right now. Please try again in a moment.',
        timestamp: new Date(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  const cardContent = (
    <>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">AI Study Companion</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? 'Exit fullscreen chat' : 'Open fullscreen chat'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-0">
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={cn(
                    message.role === 'assistant'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {message.role === 'assistant' ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3 text-sm',
                    message.role === 'assistant'
                      ? 'bg-muted text-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div
                      className="markdown-content space-y-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
                    />
                  ) : (
                    <p className="leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => handleQuickAction(action.label)}
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </>
  );

  return (
    <>
      <Card className="flex h-full flex-col overflow-hidden">
        {cardContent}
      </Card>

      {isMounted && isFullscreen
        ? createPortal(
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
              <Card className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden">
                {cardContent}
              </Card>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
