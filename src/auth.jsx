import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api('/api/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const r = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const register = async (data) => {
    const r = await api('/api/auth/register', { method: 'POST', body: data });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* i tak wylogowujemy lokalnie */
    }
    setToken(null);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, ready, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function RequireAuth({ children, admin = false }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="page-loading">Ładowanie…</div>;
  if (!user) return <Navigate to={`/logowanie?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
