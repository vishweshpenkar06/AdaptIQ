import type { ConceptStatus } from '@/lib/types';

export function toAccuracyUnit(value: number | null | undefined) {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw)) return 0;
  // Support both DB storage styles: 0..100 and 0..1
  if (raw > 1) return Math.max(0, Math.min(1, raw / 100));
  return Math.max(0, Math.min(1, raw));
}

export function toConceptStatus(status: string | null | undefined): ConceptStatus {
  if (status === 'mastered') return 'mastered';
  // Treat in-progress/developing states as weak (known but not mastered yet).
  if (status === 'weak' || status === 'in_progress' || status === 'developing') return 'weak';
  return 'missing';
}
