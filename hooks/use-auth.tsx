'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, ConstituentType } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { isDevBypass } from '@/lib/dev-mode';
import {
  getActiveMockUserId,
  getMockUserById,
  initMockStore,
  setActiveMockUserId,
  updateMockUser,
  recordActivity,
} from '@/lib/mock-store';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setDevUser?: (userId: string) => void;
  updateDevUser?: (updates: Partial<User>) => void;
  isDev?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  function loadDevUser() {
    initMockStore();
    const activeId = getActiveMockUserId();
    const activeUser = getMockUserById(activeId);
    setUser(activeUser);
    setIsLoading(false);
    if (activeUser) {
      recordActivity({
        id: `activity-${Date.now()}`,
        type: 'login',
        userId: activeUser.id,
        createdAt: new Date().toISOString(),
        metadata: { source: 'dev' },
      });
    }
  }

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
            constituentType: userData.constituent_type as ConstituentType,
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
      loadDevUser();
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
      initMockStore();
      const fallback = getMockUserById(getActiveMockUserId());
      setUser(fallback);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  }

  async function refreshUser() {
    if (isDevBypass) {
      loadDevUser();
      return;
    }

    setIsLoading(true);
    await fetchUser();
  }

  const setDevUser = (userId: string) => {
    if (!isDevBypass) return;
    setActiveMockUserId(userId);
    const next = getMockUserById(userId);
    setUser(next);
    if (next) {
      recordActivity({
        id: `activity-${Date.now()}`,
        type: 'login',
        userId: next.id,
        createdAt: new Date().toISOString(),
        metadata: { source: 'dev' },
      });
    }
  };

  const updateDevUser = (updates: Partial<User>) => {
    if (!isDevBypass || !user) return;
    const updated = updateMockUser(user.id, updates);
    if (updated) setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signOut,
        refreshUser,
        setDevUser,
        updateDevUser,
        isDev: isDevBypass,
      }}
    >
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
