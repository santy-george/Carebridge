import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  roleLoaded: boolean;
  isFieldStaff: boolean;
  fullName: string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(
  userId: string,
): Promise<{ isFieldStaff: boolean; fullName: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return { isFieldStaff: false, fullName: null };
  return { isFieldStaff: data.role === 'field_staff', fullName: data.full_name ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isFieldStaff, setIsFieldStaff] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (newSession: Session | null) => {
      if (!isMounted) return;
      setSession(newSession);

      if (!newSession) {
        setIsFieldStaff(false);
        setFullName(null);
        setRoleLoaded(true);
        return;
      }

      setRoleLoaded(false);
      const profile = await fetchProfile(newSession.user.id);
      if (!isMounted) return;
      setIsFieldStaff(profile.isFieldStaff);
      setFullName(profile.fullName);
      setRoleLoaded(true);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      applySession(initialSession).finally(() => {
        if (isMounted) setLoading(false);
      });
    });

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return;
      void applySession(newSession);
    });

    return () => {
      isMounted = false;
      subscriptionData.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, roleLoaded, isFieldStaff, fullName }}>
      {children}
    </AuthContext.Provider>
  );
}
