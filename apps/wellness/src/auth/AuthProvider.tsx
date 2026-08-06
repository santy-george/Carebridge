import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface MemberLink {
  memberId: string;
  relationshipLabel: string;
  isSelf: boolean;
}

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  memberLinks: MemberLink[];
  selectedMemberId: string | null;
  selectMember: (memberId: string) => void;
  refreshMemberLinks: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMemberLinks(userId: string): Promise<MemberLink[]> {
  const { data, error } = await supabase
    .from('member_links')
    .select('member_id, relationship_label, is_self')
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    memberId: row.member_id,
    relationshipLabel: row.relationship_label,
    isSelf: row.is_self,
  }));
}

function preferredMemberId(links: MemberLink[]): string | null {
  const preferred = links.find((link) => link.isSelf) ?? links[0];
  return preferred ? preferred.memberId : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLinks, setMemberLinks] = useState<MemberLink[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);

      if (initialSession) {
        fetchMemberLinks(initialSession.user.id).then((links) => {
          if (!isMounted) return;
          setMemberLinks(links);
          setSelectedMemberId(preferredMemberId(links));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);

      if (newSession) {
        fetchMemberLinks(newSession.user.id).then((links) => {
          if (!isMounted) return;
          setMemberLinks(links);
          setSelectedMemberId(preferredMemberId(links));
        });
      } else {
        setMemberLinks([]);
        setSelectedMemberId(null);
      }
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
    setSelectedMemberId(preferredMemberId(links));
  };

  const selectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, memberLinks, selectedMemberId, selectMember, refreshMemberLinks }}
    >
      {children}
    </AuthContext.Provider>
  );
}
