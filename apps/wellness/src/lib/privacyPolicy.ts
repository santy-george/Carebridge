import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Public, hosted copy so the stores, Google and the app all point at one page.
export const PRIVACY_POLICY_URL = 'https://carebridge-wellness.pages.dev/privacy';

// Native: in-app browser sheet, so the member never leaves the app shell.
// Web: new tab.
export async function openPrivacyPolicy(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: PRIVACY_POLICY_URL });
    return;
  }
  window.open(PRIVACY_POLICY_URL, '_blank', 'noopener');
}
