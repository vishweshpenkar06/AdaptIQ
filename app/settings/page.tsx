"use client";

import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [isSyncingMastery, setIsSyncingMastery] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const handleSyncMasteryToHindsight = async () => {
    if (isSyncingMastery) return;
    setIsSyncingMastery(true);

    const response = await fetch('/api/hindsight/sync-mastery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const payload = await response.json().catch(() => ({} as { error?: string; message?: string; synced_count?: number }));

    if (!response.ok) {
      const message = payload?.error ?? 'Could not sync mastery to Hindsight.';
      setLastSyncMessage(message);
      toast.error('Hindsight sync failed', { description: message });
      setIsSyncingMastery(false);
      return;
    }

    const message = payload?.message ?? `Synced ${payload?.synced_count ?? 0} concept snapshots.`;
    setLastSyncMessage(message);
    toast.success('Hindsight sync completed', { description: message });
    setIsSyncingMastery(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure account and app settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Your account settings will appear here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hindsight Memory Sync</CardTitle>
            <CardDescription>
              Sync your per-concept mastery accuracy levels to the Hindsight memory bank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleSyncMasteryToHindsight} disabled={isSyncingMastery}>
              {isSyncingMastery ? 'Syncing...' : 'Sync Concept Accuracy to Hindsight'}
            </Button>
            <p className="text-sm text-muted-foreground">
              This sends concept name, concept id, accuracy percentage, and mastery status for each concept.
            </p>
            {lastSyncMessage ? (
              <p className="text-sm text-foreground">Last sync: {lastSyncMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
