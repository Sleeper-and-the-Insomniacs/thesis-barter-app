import axios from 'axios';
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

// Which roles count as moderator
export const MODERATOR_ROLES = ['MODERATOR', 'ADMIN'] as const;
export type ModeratorRole = typeof MODERATOR_ROLES[number];
export type UserRole = 'USER' | ModeratorRole | null;

export const LOCATION_SETUP_REQUIRED_EVENT = 'barta:location-setup-required';

// Safe for logged-out/loading users, returns false
export function isModerator(role: UserRole): boolean {
  if (role === null) return false;
  return (MODERATOR_ROLES as readonly string[]).includes(role);
}

export interface AuthUser {
  id: number;
  name: string | null;
  email: string;
  role: UserRole;
  zipCode: string | null;
  avatarUrl: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  termsAccepted: boolean;
}

export const hasCompletedLocationSetup = (user: AuthUser | null) => Boolean(
  user
  && user.termsAccepted
  && user.zipCode
  && user.country
  && user.lat !== null
  && user.lng !== null,
);

export const requestLocationSetup = () => {
  window.dispatchEvent(new Event(LOCATION_SETUP_REQUIRED_EVENT));
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  blockedUserIds: number[];
  blockUser: (userId: number) => Promise<void>;
  unblockUser: (userId: number) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [blockedUserIds, setBlockedUserIds] = useState<number[]>([]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await axios.get('/oauth2/check', { withCredentials: true });
        let authUser = res.data.user;

        if (authUser && typeof authUser.termsAccepted !== 'boolean') {
          const userRes = await axios.get('/user/me', { withCredentials: true });
          authUser = {
            ...authUser,
            termsAccepted: userRes.data.termsAccepted,
          };
        }

        setUser(authUser);
        const blocksRes = await axios.get('/blocks', { withCredentials: true });
        setBlockedUserIds(blocksRes.data.map((b: { blockedId: number }) => b.blockedId));
      } catch {
        setUser(null);
        setBlockedUserIds([]);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const logout = useCallback(async () => {
    await axios.post('/oauth2/logout', {}, { withCredentials: true });
    setUser(null);
  }, []);

  const blockUser = useCallback(async (userId: number) => {
    await axios.post('/blocks', { blockedId: userId }, { withCredentials: true });
    setBlockedUserIds((ids) => [...ids, userId]);
  }, []);

  const unblockUser = useCallback(async (userId: number) => {
    await axios.delete(`/blocks/${userId}`, { withCredentials: true });
    setBlockedUserIds((ids) => ids.filter((id) => id !== userId));
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((currentUser) => (
      currentUser ? { ...currentUser, ...updates } : currentUser
    ));
  }, []);

  const value = useMemo(() => ({
    user, loading, logout, blockedUserIds, blockUser, unblockUser, updateUser,
  }), [user, loading, logout, blockedUserIds, blockUser, unblockUser, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
