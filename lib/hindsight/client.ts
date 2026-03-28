import 'server-only';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { getBankIdForUser, getHindsightConfig, isHindsightConfigured } from '@/lib/hindsight/config';

type RecallResult = {
  text: string;
  type?: string;
  metadata?: Record<string, unknown>;
};

const clientCache = new Map<string, HindsightClient>();

function getClient() {
  const config = getHindsightConfig();
  if (!isHindsightConfigured(config)) {
    return null;
  }

  const key = `${config.baseUrl}::${config.apiKey}`;
  const cached = clientCache.get(key);
  if (cached) {
    return cached;
  }

  const client = new HindsightClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
  });
  clientCache.set(key, client);
  return client;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown Hindsight error';
}

function toStringMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  const entries = Object.entries(metadata).map(([key, value]) => {
    if (typeof value === 'string') return [key, value] as const;
    if (typeof value === 'number' || typeof value === 'boolean') return [key, String(value)] as const;
    if (value === null || typeof value === 'undefined') return [key, ''] as const;

    try {
      return [key, JSON.stringify(value)] as const;
    } catch {
      return [key, String(value)] as const;
    }
  });

  return Object.fromEntries(entries);
}

export async function retainLearningEvent(
  userId: string,
  content: string,
  metadata?: Record<string, unknown>,
  options?: { asyncWrite?: boolean; context?: string },
) {
  const client = getClient();
  if (!client) return;

  const bankId = getBankIdForUser(userId);

  await client.retain(bankId, content, {
    async: options?.asyncWrite ?? true,
    context: options?.context ?? 'learning_event',
    metadata: toStringMetadata(metadata),
  });
}

export async function safeRetainLearningEvent(userId: string, content: string, metadata?: Record<string, unknown>) {
  try {
    await retainLearningEvent(userId, content, metadata);
  } catch (error) {
    console.warn('Hindsight retain failed:', normalizeError(error));
  }
}

export async function recallLearningSignals(userId: string, query: string) {
  const config = getHindsightConfig();
  if (!config.recallEnrichmentEnabled) {
    return [] as RecallResult[];
  }

  const client = getClient();
  if (!client) {
    return [] as RecallResult[];
  }

  try {
    const bankId = getBankIdForUser(userId);
    const response = await client.recall(bankId, query, {
      budget: 'mid',
      maxTokens: 2048,
    });

    const rawResults = (response as { results?: unknown[] })?.results ?? [];
    return rawResults
      .map((item) => {
        const candidate = item as Record<string, unknown>;
        const text = typeof candidate.text === 'string' ? candidate.text : '';
        const type = typeof candidate.type === 'string' ? candidate.type : undefined;
        const metadata = typeof candidate.metadata === 'object' && candidate.metadata
          ? (candidate.metadata as Record<string, unknown>)
          : undefined;

        return { text, type, metadata };
      })
      .filter((item) => item.text.length > 0);
  } catch (error) {
    console.warn('Hindsight recall failed:', normalizeError(error));
    return [] as RecallResult[];
  }
}

export async function reflectLearningGuidance(userId: string, prompt: string) {
  const config = getHindsightConfig();
  if (!config.reflectOnRecovery) {
    return null;
  }

  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const bankId = getBankIdForUser(userId);
    const response = await client.reflect(bankId, prompt, { budget: 'low' });
    const text = (response as { text?: string })?.text;
    return typeof text === 'string' ? text : null;
  } catch (error) {
    console.warn('Hindsight reflect failed:', normalizeError(error));
    return null;
  }
}
