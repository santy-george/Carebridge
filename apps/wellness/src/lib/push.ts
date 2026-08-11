import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';

// Nothing sends a real push yet -- Phase 3's send side (an Edge Function
// reacting to sos_alerts/medication_logs, or similar) doesn't exist. This
// module only gets a device as far as "holds a token Supabase knows about";
// wiring it end-to-end also needs an Apple Developer Program account (APNs)
// and a Firebase project (FCM) neither of which are set up yet -- see
// device_push_tokens migration and the Phase 3 tasks.

let listenersAttached = false;
let activeUserId: string | null = null;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener('registration', (token: Token) => {
    void persistToken(token.value);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
    Sentry.captureException(new Error(`Push registration failed: ${JSON.stringify(error)}`));
  });

  // Foreground delivery and tap-through listeners exist from app start so
  // there's somewhere for a real notification to land once Phase 3's send
  // side exists -- both are no-ops today since nothing produces one yet.
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('Push received in foreground:', notification);
    },
  );

  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('Push notification tapped:', action);
  });
}

async function persistToken(token: string) {
  if (!activeUserId) return;
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') return;

  const { error } = await supabase
    .from('device_push_tokens')
    .upsert(
      { user_id: activeUserId, platform, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
  if (error) {
    console.error('Failed to persist push token:', error);
    Sentry.captureException(error);
  }
}

// Called once per signed-in session (see AuthProvider). Requests
// notification permission and registers with APNs/FCM; the actual token
// arrives asynchronously via the 'registration' listener above, not as a
// return value here. No-op on the web build (dev server, Cloudflare
// preview) -- the plugin only works on a native shell.
export async function registerPushToken(userId: string): Promise<void> {
  activeUserId = userId;

  if (!Capacitor.isNativePlatform()) return;

  attachListeners();

  const status = await PushNotifications.checkPermissions();
  let receive = status.receive;
  if (receive === 'prompt' || receive === 'prompt-with-rationale') {
    receive = (await PushNotifications.requestPermissions()).receive;
  }
  if (receive !== 'granted') return;

  await PushNotifications.register();
}
