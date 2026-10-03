import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, CustomerProfile, Barber, Role, Membership } from '../types';
import { authApi } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  profile: CustomerProfile | Barber | null;
  token: string | null;
  isLoading: boolean;
  activeTenantId: string | null;
  memberships: Membership[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'bsms_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | Barber | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage and verify with backend
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.user && parsed.token) {
            setUser(parsed.user);
            setProfile(parsed.profile || null);
            setToken(parsed.token);

            // Attempt to refresh profile from backend if available
            try {
              const res = await authApi.getMe();
              if (res.user) {
                setUser(res.user);
                setProfile(res.profile);
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({
                    user: res.user,
                    profile: res.profile,
                    token: parsed.token,
                  })
                );
              }
            } catch {
              // Token is invalid, revoked, or expired - clear stale session
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
              setProfile(null);
              setToken(null);
            }
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);

    try {
      const result = await authApi.login(email, password);

      setUser(result.user);
      setProfile(result.profile);
      setToken(result.token);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: result.user,
          profile: result.profile,
          token: result.token,
        })
      );

      setIsLoading(false);
      return { success: true, message: 'Logged in successfully.' };
    } catch (apiError: any) {
      setIsLoading(false);
      return {
        success: false,
        message: apiError.message || 'Invalid email or password.',
      };
    }
  };

  const register = async (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
  }): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);

    try {
      const result = await authApi.register(data);

      setUser(result.user);
      setProfile(result.profile);
      setToken(result.token);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: result.user,
          profile: result.profile,
          token: result.token,
        })
      );

      setIsLoading(false);
      return { success: true, message: 'Account registered successfully.' };
    } catch (apiError: any) {
      setIsLoading(false);
      return {
        success: false,
        message: apiError.message || 'Registration failed.',
      };
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    setUser(null);
    setProfile(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.user) {
        setUser(res.user);
        setProfile(res.profile);
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            user: res.user,
            profile: res.profile,
          })
        );
      }
    } catch {
      // ignore
    }
  };

  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN';

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;

    // Normalizing legacy ADMIN to include SHOP_OWNER
    let allowed = [...roles];
    if (roles.includes('ADMIN')) {
      allowed.push('SUPER_ADMIN', 'SHOP_OWNER');
    }

    return allowed.includes(user.role) || (user.platformRole ? allowed.includes(user.platformRole) : false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isLoading,
        activeTenantId: user?.activeTenantId || null,
        memberships: user?.memberships || [],
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};