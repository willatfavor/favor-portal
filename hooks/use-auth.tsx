'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { createClient } from '@/lib/supabase/client';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const isDevBypass = process.env.NODE_ENV !== 'production' && !isSupabaseConfigured;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  async function fetchUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user:', error);
          setUser(null);
        } else if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            phone: userData.phone || undefined,
            blackbaudConstituentId: userData.blackbaud_constituent_id || undefined,
            constituentType: userData.constituent_type as any,
            lifetimeGivingTotal: Number(userData.lifetime_giving_total),
            rddAssignment: userData.rdd_assignment || undefined,
            avatarUrl: userData.avatar_url || undefined,
            createdAt: userData.created_at,
            lastLogin: userData.last_login || undefined,
          });
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isDevBypass) {
      setUser({
        id: 'dev-user',
        email: 'dev@favor.local',
        firstName: 'Dev',
        lastName: 'User',
        constituentType: 'individual',
        lifetimeGivingTotal: 0,
        createdAt: new Date().toISOString(),
      });
      setIsLoading(false);
      return;
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (isDevBypass) {
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  }

  async function refreshUser() {
    if (isDevBypass) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    await fetchUser();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
