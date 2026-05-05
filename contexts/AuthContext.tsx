'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User, engineApi } from '@/lib/api';
import { getStoredUser, clearAuth, saveAuth } from '@/lib/auth';

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

// Events that count as user activity
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs so callbacks always see latest values without re-registering listeners
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enginePaused    = useRef(false);

  // ── Engine helpers ──────────────────────────────────────────────────────────
  const pauseEngine = useCallback(async () => {
    if (enginePaused.current) return;
    enginePaused.current = true;
    try { await engineApi.pause(); } catch { /* server may be unreachable */ }
  }, []);

  const resumeEngine = useCallback(async () => {
    if (!enginePaused.current) return;
    enginePaused.current = false;
    try { await engineApi.resume(); } catch { /* server may be unreachable */ }
  }, []);

  // ── Inactivity timer ────────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    // If engine was paused due to inactivity, resume it on activity
    if (enginePaused.current) resumeEngine();

    inactivityTimer.current = setTimeout(() => {
      // User has been inactive for 5 minutes — pause the engine
      pauseEngine();
    }, INACTIVITY_MS);
  }, [pauseEngine, resumeEngine]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Pause engine before clearing session
    await pauseEngine();
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }, [pauseEngine]);

  const login = useCallback((token: string, userData: User) => {
    saveAuth(token, userData);
    setUser(userData);
    // Resume engine when user logs in
    resumeEngine();
    resetInactivityTimer();
  }, [resumeEngine, resetInactivityTimer]);

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  // ── Activity listeners (only when logged in) ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Start the inactivity timer immediately
    resetInactivityTimer();

    const handler = () => resetInactivityTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // ── Pause engine when tab is hidden, resume when visible ───────────────────
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.hidden) {
        pauseEngine();
      } else {
        resumeEngine();
        resetInactivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, pauseEngine, resumeEngine, resetInactivityTimer]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
