import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { retainLearningEvent } from '@/lib/hindsight/client';
import { getBankIdForUser, getHindsightConfig, isHindsightConfigured } from '@/lib/hindsight/config';
import { toAccuracyUnit } from '@/lib/mastery-utils';

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
    return NextResponse.json(
      {
        error: 'Hindsight is not configured. Set HINDSIGHT_ENABLED, HINDSIGHT_API_BASE_URL, and HINDSIGHT_API_KEY.',
      },
      { status: 400 },
    );
  }

  const bankId = getBankIdForUser(user.id, config);

  const { data: masteryRows, error: masteryError } = await supabase
    .from('user_concept_mastery')
    .select('concept_id, mastery_level, status, concepts:concept_id(name)')
    .eq('user_id', user.id)
    .order('last_practiced_at', { ascending: false, nullsFirst: false })
    .limit(500);

  if (masteryError) {
    return NextResponse.json({ error: masteryError.message }, { status: 500 });
  }

  const rows = masteryRows ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      synced_count: 0,
      message: 'No concept mastery rows found to sync.',
    });
  }

  const syncedAt = new Date().toISOString();

  let successCount = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const conceptName = Array.isArray(row.concepts) && row.concepts.length > 0
      ? row.concepts[0]?.name ?? row.concept_id
      : row.concept_id;
    const accuracy = toAccuracyUnit(row.mastery_level);

    try {
      await retainLearningEvent(
        user.id,
        `Concept mastery snapshot: ${conceptName} (${row.concept_id}) accuracy ${(accuracy * 100).toFixed(1)}% status ${row.status ?? 'unknown'}.`,
        {
          eventType: 'mastery_sync',
          syncedAt,
          conceptId: row.concept_id,
          conceptName,
          accuracy,
          accuracyPercent: Number((accuracy * 100).toFixed(1)),
          status: row.status ?? 'unknown',
        },
        { asyncWrite: false, context: 'mastery_sync' },
      );
      successCount += 1;
    } catch (error) {
      failures.push(
        `${row.concept_id}: ${error instanceof Error ? error.message : 'Unknown retain error'}`,
      );
    }
  }

  const summary = rows
    .map((row) => {
      const conceptName = Array.isArray(row.concepts) && row.concepts.length > 0
        ? row.concepts[0]?.name ?? row.concept_id
        : row.concept_id;
      const accuracy = toAccuracyUnit(row.mastery_level);
      return `${conceptName}: ${(accuracy * 100).toFixed(1)}% (${row.status ?? 'unknown'})`;
    })
    .join('; ');

  try {
    await retainLearningEvent(
      user.id,
      `Mastery sync summary (${rows.length} concepts): ${summary}`,
      {
        eventType: 'mastery_sync_summary',
        syncedAt,
        conceptCount: rows.length,
      },
      { asyncWrite: false, context: 'mastery_sync_summary' },
    );
  } catch (error) {
    failures.push(`summary: ${error instanceof Error ? error.message : 'Unknown retain error'}`);
  }

  return NextResponse.json(
    {
      ok: failures.length === 0,
      bank_id: bankId,
      attempted_count: rows.length,
      synced_count: successCount,
      failed_count: failures.length,
      failures,
      message: failures.length === 0
        ? 'Mastery accuracy synced to Hindsight memory bank.'
        : 'Mastery sync partially failed. Check failure details.',
    },
    { status: failures.length === 0 ? 200 : 207 },
  );
}
