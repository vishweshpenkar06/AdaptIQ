import { NextResponse } from 'next/server';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { createClient } from '@/lib/supabase/server';
import { getBankIdForUser, getHindsightConfig, isHindsightConfigured } from '@/lib/hindsight/config';

function mask(value: string) {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const config = getHindsightConfig();
  const bankId = getBankIdForUser(user.id, config);

  const { count: unresolvedCount, error: unresolvedError } = await supabase
    .from('hindsight_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('resolved', false);

  const { data: latestLocalEvent } = await supabase
    .from('hindsight_events')
    .select('id, created_at, root_concept_id, resolved')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    user_id: user.id,
    hindsight: {
      enabled: config.enabled,
      configured: isHindsightConfigured(config),
      base_url: mask(config.baseUrl),
      api_key_present: Boolean(config.apiKey),
      api_key_masked: config.apiKey ? mask(config.apiKey) : '',
      bank_id_override: config.bankId || null,
      bank_namespace: config.bankNamespace,
      bank_id: bankId,
      recall_enrichment_enabled: config.recallEnrichmentEnabled,
      reflect_on_recovery: config.reflectOnRecovery,
    },
    local_hindsight_events: {
      unresolved_count: unresolvedError ? null : (unresolvedCount ?? 0),
      unresolved_count_error: unresolvedError ? unresolvedError.message : null,
      latest_event: latestLocalEvent ?? null,
    },
  });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const config = getHindsightConfig();
  if (!isHindsightConfigured(config)) {
    return NextResponse.json({
      error: 'Hindsight is not fully configured.',
      configured: false,
      enabled: config.enabled,
      has_base_url: Boolean(config.baseUrl),
      has_api_key: Boolean(config.apiKey),
    }, { status: 400 });
  }

  const bankId = getBankIdForUser(user.id, config);
  const marker = `debug_probe_${Date.now()}`;

  try {
    const client = new HindsightClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });

    await client.retain(
      bankId,
      `AdaptIQ debug probe for user ${user.id}. Marker: ${marker}`,
      {
        async: false,
        context: 'debug_probe',
        metadata: {
          source: 'api_hindsight_debug',
          marker,
        },
      },
    );

    const recallResponse = await client.recall(bankId, marker, {
      budget: 'low',
      maxTokens: 512,
    });
    const recallCount = ((recallResponse as { results?: unknown[] })?.results ?? []).length;

    return NextResponse.json({
      ok: true,
      message: 'Hindsight retain probe succeeded.',
      bank_id: bankId,
      marker,
      recall_match_count: recallCount,
      note: 'If recall_match_count is 0, indexing may still be in progress. Check the Hindsight dashboard bank and retry in a few seconds.',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      bank_id: bankId,
      marker,
      error: normalizeError(error),
    }, { status: 500 });
  }
}
