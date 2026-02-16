'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, ConstituentType } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { isDevBypass } from '@/lib/dev-mode';
import {
  getActiveMockUserId,
  getMockUserById,
  getMockRolesForUser,
  initMockStore,
  setActiveMockUserId,
  updateMockUser,
  recordActivity,
} from '@/lib/mock-store';
import { normalizeAdminRoles, resolveAdminPermissions } from '@/lib/admin/roles';

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
    if (activeUser) {
      const roles = getMockRolesForUser(activeUser.id).map((entry) => entry.roleKey);
      const permissions = resolveAdminPermissions(Boolean(activeUser.isAdmin), roles);
      setUser({ ...activeUser, roles, permissions });
    } else {
      setUser(null);
    }
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
        const [{ data: userData, error }, { data: roleData }] = await Promise.all([
          supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('user_roles')
            .select('role_key')
            .eq('user_id', session.user.id),
        ]);

        if (error) {
          console.error('Error fetching user:', error);
          setUser(null);
        } else if (userData) {
          const roles = normalizeAdminRoles((roleData ?? []).map((entry) => entry.role_key));
          const permissions = resolveAdminPermissions(Boolean(userData.is_admin), roles);
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
            isAdmin: userData.is_admin,
            roles,
            permissions,
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
    const nextUser = getMockUserById(userId);
    if (nextUser) {
      const roles = getMockRolesForUser(nextUser.id).map((entry) => entry.roleKey);
      const permissions = resolveAdminPermissions(Boolean(nextUser.isAdmin), roles);
      setUser({ ...nextUser, roles, permissions });
      recordActivity({
        id: `activity-${Date.now()}`,
        type: 'login',
        userId: nextUser.id,
        createdAt: new Date().toISOString(),
        metadata: { source: 'dev' },
      });
      return;
    }
    setUser(null);
  };

  const updateDevUser = (updates: Partial<User>) => {
    if (!isDevBypass || !user) return;
    const updated = updateMockUser(user.id, updates);
    if (updated) {
      const roles = getMockRolesForUser(updated.id).map((entry) => entry.roleKey);
      const permissions = resolveAdminPermissions(Boolean(updated.isAdmin), roles);
      setUser({ ...updated, roles, permissions });
    }
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
