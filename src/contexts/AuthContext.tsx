import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (userName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedProfile = localStorage.getItem('profile');
    
    if (savedUser && savedProfile) {
      setUser(JSON.parse(savedUser));
      setProfile(JSON.parse(savedProfile));
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (userName: string, password: string) => {
    const { data: users, error } = await supabase
      .from('Users')
      .select('*')
      .eq('userName', userName)
      .eq('password', password);

    if (error) {
      throw new Error('Errore durante la verifica: ' + error.message);
    }

    if (!users || users.length === 0) {
      throw new Error('Username o password non validi');
    }

    const user = { id: users[0].id, email: users[0].userName } as User;
    setUser(user);
    setProfile(users[0]);
    
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('profile', JSON.stringify(users[0]));
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
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
