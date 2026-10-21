import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { request } from '../api/http';

export type Role = 'admin' | 'manager' | 'employee' | 'leader';
export type SessionUser = { id: string; email: string; role: Role; employee?: { fullName?: string } | null };
type AuthValue = { user: SessionUser | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { request<{ user: SessionUser }>('/auth/me').then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  async function signIn(email: string, password: string) { const result = await request<{ user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(result.user); }
  async function signOut() { await request('/auth/logout', { method: 'POST' }); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be inside AuthProvider'); return value; }
