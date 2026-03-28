import 'server-only';

type PromptType = 'explanation' | 'diagnosis' | 'recovery' | 'pattern';

type GenerateAIResponseOptions = {
  promptType?: PromptType;
  cacheKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxSentences?: number;
};

type CacheEntry = {
  response: string;
  expiresAt: number;
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function clampSentenceCount(text: string, maxSentences: number) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (sentences.length <= maxSentences) return text.trim();
  return sentences.slice(0, maxSentences).join(' ').trim();
}

function getCachedResponse(key?: string) {
  if (!key) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.response;
}

function setCachedResponse(key: string | undefined, response: string) {
  if (!key) return;
  cache.set(key, {
    response,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });
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

export async function generateAIResponse(prompt: string, options?: GenerateAIResponseOptions) {
  const cached = getCachedResponse(options?.cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const requestPayload = {
    model: GROQ_MODEL,
    temperature: Math.max(0.3, Math.min(0.5, options?.temperature ?? 0.35)),
    max_tokens: options?.maxTokens ?? 450,
    messages: [{ role: 'user', content: prompt }],
  };

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
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const upstreamError = (data as { error?: { message?: string } })?.error?.message
      ?? `AI provider error (${response.status})`;
    throw new Error(upstreamError);
  }

  const reply = (data as { choices?: Array<{ message?: { content?: string } }> })
    ?.choices?.[0]?.message?.content;

  if (!reply || typeof reply !== 'string') {
    throw new Error('No reply received from model.');
  }

  const normalized = clampSentenceCount(reply, options?.maxSentences ?? 6);
  setCachedResponse(options?.cacheKey, normalized);
  return normalized;
}
