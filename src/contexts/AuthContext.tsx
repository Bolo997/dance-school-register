import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (sessionUser: User | null) => {
    if (!sessionUser) {
      setProfile(null);
      return;
    }

    // Tabella `Users` con colonna `uid` collegata a auth.users.id
    try {
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('uid', sessionUser.id)
        .maybeSingle();

      if (error) {
        setProfile(null);
        return;
      }

      setProfile((data as unknown as UserProfile) ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          setUser(null);
          setProfile(null);
          return;
        }

        const session = data.session;
        setUser(session?.user ?? null);
        // Non bloccare mai la UI su un profilo che non c’è o policy/rls temporanee.
        fetchProfile(session?.user ?? null).catch(() => {
          /* noop */
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      fetchProfile(session?.user ?? null).catch(() => {
        /* noop */
      });
      setLoading(false);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Su ritorno in foreground, riallinea sessione/token e profilo.
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (!mounted) return;
            setUser(data.session?.user ?? null);
            fetchProfile(data.session?.user ?? null).catch(() => {
              /* noop */
            });
          })
          .catch(() => {
            /* noop */
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    // Supabase Auth richiede email+password. Se in UI usi “username”, mappalo ad una email.
    // Qui assumiamo che l’input sia già un’email valida.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    setUser(data.user);
    await fetchProfile(data.user);
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signOut
  }), [user, profile, loading, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
