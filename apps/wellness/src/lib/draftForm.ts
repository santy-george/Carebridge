import { useEffect } from 'react';

export const DRAFT_MAX_AGE_MS = 10 * 60 * 1000;

function storageKey(key: string): string {
  return `cbh-draft:${key}`;
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; values: T };
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    return parsed.values;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, values: T): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // storage unavailable/full -- draft persistence is best-effort
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}

/**
 * Restores a form's fields from localStorage when `active` becomes true (if
 * a draft under 10 minutes old exists), and saves `values` back on every
 * change while active. Callers must also call `clearDraft(key)` on
 * successful submit and on an explicit cancel/close, so a finished or
 * abandoned form doesn't come back next time the sheet opens.
 */
export function useDraftForm<T>(key: string, active: boolean, values: T, restore: (v: T) => void) {
  useEffect(() => {
    if (!active) return;
    const draft = loadDraft<T>(key);
    if (draft) restore(draft);
    // Only re-run when the sheet opens/closes or the key changes -- `restore`
    // is a fresh closure each render and `values` changes on every
    // keystroke, neither should re-trigger a restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => saveDraft(key, values), 400);
    return () => clearTimeout(id);
  }, [active, key, values]);
}

/**
 * Remembers which sheet was open on a page across an iOS WKWebView reload
 * (backgrounding the app reloads the current page in place -- the URL
 * survives, but React state, including which sheet was open, does not).
 * On mount, reopens the last sheet if it was opened within the last 10
 * minutes and is one of `allowed`. Callers must call
 * `clearDraft(\`open-sheet:${pageKey}\`)` alongside their existing draft
 * clears on submit/close, or a finished sheet will reopen next launch.
 */
export function usePersistedSheet<S extends string>(
  pageKey: string,
  sheet: S | null,
  setSheet: (s: S) => void,
  allowed: readonly S[],
) {
  const storageKeyForSheet = `open-sheet:${pageKey}`;

  useEffect(() => {
    const saved = loadDraft<S>(storageKeyForSheet);
    if (saved && (allowed as readonly string[]).includes(saved)) setSheet(saved);
    // Mount-only: this restores whatever sheet was open when the app was
    // last backgrounded, not something that should re-fire on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sheet) saveDraft(storageKeyForSheet, sheet);
  }, [storageKeyForSheet, sheet]);
}
