import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken as saveToken, clearToken, getToken } from '@/lib/api';

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  roles: string[];
  status: string;
  org_name?: string | null;
  company_name?: string | null;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.get<User>('/api/user/profile')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  function login(token: string, userData: User) {
    saveToken(token);
    setUser(userData);
  }

  async function logout() {
    try { await api.post('/api/signout'); } catch { /* stateless — discard error */ }
    clearToken();
    setUser(null);
  }

  async function refreshUser() {
    const u = await api.get<User>('/api/user/profile');
    setUser(u);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
