import axios from 'axios';

// const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:27017';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL!

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  users: () => api.get('/api/auth/users'),
};

// ── Signals ───────────────────────────────────────────────────────────────────
export const signalApi = {
  live: () => api.get('/api/signals/live'),
  stats: () => api.get('/api/signals/stats'),
  list: (params?: {
    status?: string;
    asset?: string;
    page?: number;
    limit?: number;
    generatedBy?: 'engine' | 'manual';
  }) => api.get('/api/signals', { params }),
  get: (id: string) => api.get(`/api/signals/${id}`),
  create: (data: SignalPayload) => api.post('/api/signals', data),
  update: (id: string, data: Partial<SignalPayload>) => api.put(`/api/signals/${id}`, data),
  delete: (id: string) => api.delete(`/api/signals/${id}`),
};

// ── Engine ────────────────────────────────────────────────────────────────────
export const engineApi = {
  status: () => api.get('/api/engine/status'),
  pause:  () => api.post('/api/engine/pause'),
  resume: () => api.post('/api/engine/resume'),
};

// ── Signal result ─────────────────────────────────────────────────────────────
export const setSignalResult = (id: string, result: 'win' | 'loss' | 'draw') =>
  api.post(`/api/signals/${id}/result`, { result });

export const cancelSignal = (id: string) =>
  api.post(`/api/signals/${id}/cancel`);

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface Signal {
  _id: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  timeframe: string;
  entryPrice: number;
  entryTime: string;
  expiryTime: string;
  confidence: number;
  indicators: string[];
  notes: string;
  // Shared signal status (neutral — not user-specific)
  status: 'pending' | 'active' | 'expired' | 'won' | 'lost' | 'skipped' | 'cancelled';
  result: 'win' | 'loss' | 'draw' | null;
  createdBy: { name: string; email?: string };
  createdAt: string;
  generatedBy: 'engine' | 'manual';
  // Per-user overlay — only present when fetched by an authenticated user
  userStatus: 'taken' | 'cancelled' | 'won' | 'lost' | 'draw' | null;
  userResult: 'win' | 'loss' | 'draw' | null;
}

export interface EngineStatus {
  status: 'running' | 'paused' | 'stopped';
  nextSignalIn: string;
  latestSignal: Signal | null;
}

export interface SignalPayload {
  asset: string;
  direction: 'BUY' | 'SELL';
  timeframe: string;
  entryPrice: number;
  expiryTime: string;
  confidence?: number;
  indicators?: string[];
  notes?: string;

  status?: Signal['status'];
  result?: Signal['result'];
}

export interface Stats {
  win: number;
  loss: number;
  draw: number;
  pending: number;
  total: number;
  winRate: string;
}
