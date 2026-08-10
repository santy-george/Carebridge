import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { capacitorPreferencesStorage } from '../lib/storage-adapter';

export interface MemberLink {
  memberId: string;
  relationshipLabel: string;
  isSelf: boolean;
}

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  linksLoaded: boolean;
  memberLinks: MemberLink[];
  selectedMemberId: string | null;
  selectMember: (memberId: string) => void;
  refreshMemberLinks: () => Promise<void>;
  consentStatus: 'active' | 'withdrawal_pending' | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SELECTED_MEMBER_STORAGE_KEY = 'wellness.selectedMemberId';

async function fetchMemberLinks(userId: string): Promise<MemberLink[]> {
  const { data, error } = await supabase
    .from('member_links')
    .select('member_id, relationship_label, is_self')
    .eq('user_id', userId)
    .order('created_at');

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    memberId: row.member_id,
    relationshipLabel: row.relationship_label,
    isSelf: row.is_self,
  }));
}

async function fetchConsentStatus(userId: string): Promise<'active' | 'withdrawal_pending' | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('consent_status')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
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
  const [memberLinks, setMemberLinks] = useState<MemberLink[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [consentStatus, setConsentStatus] = useState<'active' | 'withdrawal_pending' | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (newSession: Session | null) => {
      if (!isMounted) return;
      setSession(newSession);

      if (!newSession) {
        setMemberLinks([]);
        setSelectedMemberId(null);
        setConsentStatus(null);
        setLinksLoaded(true);
        return;
      }

      setLinksLoaded(false);
      const [links, status] = await Promise.all([
        fetchMemberLinks(newSession.user.id),
        fetchConsentStatus(newSession.user.id),
      ]);
      if (!isMounted) return;
      setConsentStatus(status);

      let storedMemberId: string | null = null;
      try {
        storedMemberId = await capacitorPreferencesStorage.getItem(SELECTED_MEMBER_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to read selected member from Capacitor Preferences:', error);
      }

      if (!isMounted) return;
      setMemberLinks(links);
      setSelectedMemberId(resolveSelection(links, storedMemberId));
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

  const refreshMemberLinks = async () => {
    if (!session) return;
    const links = await fetchMemberLinks(session.user.id);
    setMemberLinks(links);
    // Preserve the current selection if it's still among the refreshed
    // links (e.g. after linking an additional member) -- only fall back to
    // the is_self/first-link default if it's no longer present.
    setSelectedMemberId((current) => resolveSelection(links, current));
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
