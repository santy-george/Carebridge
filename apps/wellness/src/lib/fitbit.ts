import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

// Fitbit via the Google Health API: the server holds the Google token and
// pulls SpO2 on a schedule. The app only starts the consent flow, shows the
// connection state, and disconnects. It never sees a Google token.

export type FitbitStatus = 'not_connected' | 'ok' | 'needs_reconnect';

export interface FitbitConnection {
  status: FitbitStatus;
  lastSyncedAt: string | null;
}

export async function fetchFitbitConnection(memberId: string): Promise<FitbitConnection> {
  const { data, error } = await supabase.rpc('get_wearable_connection_status', {
    p_member_id: memberId,
  });
  if (error) throw error;
  const row = (data ?? []).find((r) => r.provider === 'google_health');
  if (!row) return { status: 'not_connected', lastSyncedAt: null };
  return {
    status: row.status === 'needs_reconnect' ? 'needs_reconnect' : 'ok',
    lastSyncedAt: row.last_synced_at ?? null,
  };
}

// Google refuses sign-in inside an embedded WebView, so consent always opens
// in the system browser (Custom Tabs / SFSafariViewController on native).
export async function startFitbitConnect(memberId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-health-connect', {
    body: { member_id: memberId },
  });
  if (error || !data?.url) throw error ?? new Error('no consent url');
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: data.url });
  } else {
    window.open(data.url, '_blank', 'noopener');
  }
}

export async function disconnectFitbit(memberId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-health-disconnect', {
    body: { member_id: memberId },
  });
  if (error || !data?.ok) throw error ?? new Error('disconnect failed');
}
