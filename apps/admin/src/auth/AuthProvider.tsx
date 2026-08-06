import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  roleLoaded: boolean;
  isCoordinator: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchIsCoordinator(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'coordinator';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (newSession: Session | null) => {
      if (!isMounted) return;
      setSession(newSession);

      if (!newSession) {
        setIsCoordinator(false);
        setRoleLoaded(true);
        return;
      }

      setRoleLoaded(false);
      const coordinator = await fetchIsCoordinator(newSession.user.id);
      if (!isMounted) return;
      setIsCoordinator(coordinator);
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
    <AuthContext.Provider value={{ session, loading, roleLoaded, isCoordinator }}>
      {children}
    </AuthContext.Provider>
  );
}
