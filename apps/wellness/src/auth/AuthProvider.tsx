import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';
import { toSentryError } from '../lib/toSentryError';
import { capacitorPreferencesStorage } from '../lib/storage-adapter';
import { registerPushToken } from '../lib/push';
import { registerHealthKit } from '../lib/healthkit';

export interface MemberLink {
  memberId: string;
  relationshipLabel: string;
  isSelf: boolean;
}

// 'unknown' is a distinct sentinel for "the consent_status fetch itself
// failed", kept separate from null ("no profile row exists"). Route guards
// must fail CLOSED on 'unknown': collapsing a transient fetch error into
// null previously granted full app access to a user whose withdrawal may
// actually be pending.
export type ConsentStatus = 'active' | 'withdrawal_pending' | 'unknown' | null;

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  linksLoaded: boolean;
  linksFetchError: boolean;
  memberLinks: MemberLink[];
  selectedMemberId: string | null;
  selectMember: (memberId: string) => void;
  refreshMemberLinks: () => Promise<void>;
  consentStatus: ConsentStatus;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SELECTED_MEMBER_STORAGE_KEY = 'wellness.selectedMemberId';

// Mirrors fetchConsentStatus's error/null distinction below: a failed query
// and a genuinely-empty link list are NOT the same thing. Collapsing both
// into [] previously bounced an already-linked user back to /link-member on
// any transient fetch failure (e.g. a background token refresh hitting a
// network blip) -- reported live, the linked user was mid-session on Home
// and got redirected to re-enter an invite code they didn't need.
async function fetchMemberLinks(userId: string): Promise<{ links: MemberLink[]; error: boolean }> {
  const { data, error } = await supabase
    .from('member_links')
    .select('member_id, relationship_label, is_self')
    .eq('user_id', userId)
    .order('created_at');

  if (error || !data) {
    console.error('Failed to fetch member_links:', error);
    Sentry.captureException(toSentryError(error, 'member_links fetch returned no data'));
    return { links: [], error: true };
  }

  return {
    links: data.map((row) => ({
      memberId: row.member_id,
      relationshipLabel: row.relationship_label,
      isSelf: row.is_self,
    })),
    error: false,
  };
}

async function fetchConsentStatus(userId: string): Promise<ConsentStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('consent_status')
    .eq('id', userId)
    .maybeSingle();
  // A failed query and a genuinely missing profile row are NOT the same
  // thing. 'unknown' is what makes RequireAuth fail closed instead of open.
  if (error) {
    console.error('Failed to fetch consent_status:', error);
    Sentry.captureException(toSentryError(error, 'consent_status fetch failed'));
    return 'unknown';
  }
  if (!data) return null;
  return data.consent_status as 'active' | 'withdrawal_pending';
}

function preferredMemberId(links: MemberLink[]): string | null {
  const preferred = links.find((link) => link.isSelf) ?? links[0];
  return preferred ? preferred.memberId : null;
}

// Resolves which member should be selected given a candidate id (e.g. the
// previously-selected member, from Preferences or in-memory state). Falls
// back to the is_self-then-first logic when the candidate is no longer
// among the current links (or there wasn't one).
function resolveSelection(links: MemberLink[], candidateId: string | null): string | null {
  if (candidateId && links.some((link) => link.memberId === candidateId)) {
    return candidateId;
  }
  return preferredMemberId(links);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks member_links-loading state for the *current* session, separately
  // from the one-shot initial `loading` flag above. A session can arrive
  // well after the initial mount (e.g. right after Login.tsx signs in) --
  // route guards need to know links are still in flight for that session
  // too, or they redirect a returning user to /link-member before the
  // fetch resolves (see finding 1).
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [linksFetchError, setLinksFetchError] = useState(false);
  const [memberLinks, setMemberLinks] = useState<MemberLink[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(null);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (newSession: Session | null) => {
      if (!isMounted) return;
      setSession(newSession);

      if (!newSession) {
        setMemberLinks([]);
        setSelectedMemberId(null);
        setConsentStatus(null);
        setLinksFetchError(false);
        setLinksLoaded(true);
        return;
      }

      setLinksLoaded(false);
      const [linksResult, status] = await Promise.all([
        fetchMemberLinks(newSession.user.id),
        fetchConsentStatus(newSession.user.id),
      ]);
      if (!isMounted) return;
      setConsentStatus(status);
      setLinksFetchError(linksResult.error);

      let storedMemberId: string | null = null;
      try {
        storedMemberId = await capacitorPreferencesStorage.getItem(SELECTED_MEMBER_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to read selected member from Capacitor Preferences:', error);
      }

      if (!isMounted) return;
      // A failed fetch must not overwrite already-known-good links with an
      // empty list -- keep the previous state and let the route guards
      // treat linksFetchError as "unknown", not "confirmed zero links".
      if (!linksResult.error) {
        setMemberLinks(linksResult.links);
        setSelectedMemberId(resolveSelection(linksResult.links, storedMemberId));
      }
      setLinksLoaded(true);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      applySession(initialSession).finally(() => {
        if (isMounted) setLoading(false);
      });
    });

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      // The initial session is already handled by the getSession() call
      // above (INITIAL_SESSION fires for the same session data on
      // subscribe) -- skip it here to avoid fetching member_links twice on
      // mount (finding 8). Every subsequent real change (SIGNED_IN,
      // SIGNED_OUT, TOKEN_REFRESHED, ...) still goes through applySession.
      if (event === 'INITIAL_SESSION') return;
      void applySession(newSession);
    });

    return () => {
      isMounted = false;
      subscriptionData.subscription.unsubscribe();
    };
  }, []);

  // Push registration is best-effort and independent of the auth-loading
  // critical path above -- a permission prompt or registration failure must
  // never block the app from loading. Not tied to `linksLoaded`/`loading`
  // on purpose.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    void registerPushToken(userId);
  }, [session?.user.id]);

  // HealthKit registration mirrors the push-registration effect above: best-
  // effort, independent of the auth-loading critical path, never blocks the
  // app. Needs selectedMemberId (not just the session) since readings are
  // ingested against a specific member.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !selectedMemberId) return;
    void registerHealthKit(userId, selectedMemberId);
  }, [session?.user.id, selectedMemberId]);

  const refreshMemberLinks = async () => {
    if (!session) return;
    const linksResult = await fetchMemberLinks(session.user.id);
    setLinksFetchError(linksResult.error);
    if (linksResult.error) return;
    setMemberLinks(linksResult.links);
    // Preserve the current selection if it's still among the refreshed
    // links (e.g. after linking an additional member) -- only fall back to
    // the is_self/first-link default if it's no longer present.
    setSelectedMemberId((current) => resolveSelection(linksResult.links, current));
  };

  const selectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    void capacitorPreferencesStorage.setItem(SELECTED_MEMBER_STORAGE_KEY, memberId);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        linksLoaded,
        linksFetchError,
        memberLinks,
        selectedMemberId,
        selectMember,
        refreshMemberLinks,
        consentStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
