import { NextRequest, NextResponse } from 'next/server';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatContext = {
  conceptName?: string;
  questionText?: string;
  isAnswerIncorrect?: boolean;
};

type ChatPayload = {
  message: string;
  messages?: ChatMessage[];
  context?: ChatContext;
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 30000;

function isValidMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<ChatMessage>;
    return (
      (candidate.role === 'user' || candidate.role === 'assistant')
      && typeof candidate.content === 'string'
    );
  });
}

function parsePayload(value: unknown): { ok: true; payload: ChatPayload } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }

  const payload = value as Partial<ChatPayload>;

  if (typeof payload.message !== 'string' || payload.message.trim().length === 0) {
    return { ok: false, error: 'Field "message" is required.' };
  }

  if (payload.messages !== undefined && !isValidMessages(payload.messages)) {
    return { ok: false, error: 'Field "messages" must be an array of { role, content }.' };
  }

  if (payload.context !== undefined && (typeof payload.context !== 'object' || payload.context === null)) {
    return { ok: false, error: 'Field "context" must be an object.' };
  }

  return {
    ok: true,
    payload: {
      message: payload.message.trim(),
      messages: payload.messages ?? [],
      context: payload.context ?? {},
    },
  };
}

function buildSystemPrompt(context: ChatContext) {
  const lines = [
    'You are AdaptIQ AI Study Companion.',
    'Explain clearly, be concise, and focus on learning outcomes.',
    'When asked for a hint, provide a hint first without revealing the full answer immediately.',
  ];

  if (context.conceptName) lines.push(`Current concept: ${context.conceptName}`);
  if (context.questionText) lines.push(`Current question: ${context.questionText}`);
  if (typeof context.isAnswerIncorrect === 'boolean') {
    lines.push(`User last answer was incorrect: ${context.isAnswerIncorrect ? 'yes' : 'no'}`);
  }

  return lines.join('\n');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { message, messages, context } = parsed.payload;

  const requestPayload = {
    model: GROQ_MODEL,
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: 'system', content: buildSystemPrompt(context ?? {}) },
      ...messages.slice(-8),
      { role: 'user', content: message },
    ],
  };

  try {
    const response = await fetchWithTimeout(
      GROQ_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      },
      REQUEST_TIMEOUT_MS,
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const upstreamError = (data as { error?: { message?: string } })?.error?.message
        ?? `Groq API error (${response.status})`;
      return NextResponse.json({ error: upstreamError }, { status: 502 });
    }

    const reply = (data as { choices?: Array<{ message?: { content?: string } }> })
      ?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== 'string') {
      return NextResponse.json({ error: 'No reply received from model.' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'AI request timed out.' }, { status: 504 });
    }

    return NextResponse.json({ error: 'AI service is currently unavailable.' }, { status: 500 });
  }
}