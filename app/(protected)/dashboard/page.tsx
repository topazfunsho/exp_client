'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { signalApi, Signal, Stats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import SignalCard from '@/components/SignalCard';
import StatsBar from '@/components/StatsBar';
import EngineStatusBar from '@/components/EngineStatus';
import Loader from '@/components/Loader';
import { playSignalAlert, unlockAudio } from '@/lib/sound';
import { RefreshCw, Zap, Cpu, TrendingUp, Volume2, VolumeX } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function shouldShow(s: Signal) {
  return s.status === 'pending' || s.status === 'active';
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [displaySignals, setDisplaySignals] = useState<Signal[]>([]);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [newSignalFlash, setNewSignalFlash] = useState(false);
  const [soundEnabled, setSoundEnabled]     = useState(true);
  const [sseConnected, setSseConnected]     = useState(false);

  const soundEnabledRef = useRef(true);
  const prevSignalIds   = useRef<Set<string>>(new Set());
  const hasFetchedOnce  = useRef(false);
  const sseRef          = useRef<EventSource | null>(null);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Unlock audio on first interaction
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('click',      unlock, { passive: true });
    window.addEventListener('keydown',    unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      window.removeEventListener('click',      unlock);
      window.removeEventListener('keydown',    unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // ── Trigger alert when a new signal is detected ──────────────────────────
  const triggerNewSignalAlert = useCallback(() => {
    setNewSignalFlash(true);
    setTimeout(() => setNewSignalFlash(false), 4000);
    if (soundEnabledRef.current) {
      unlockAudio();
      playSignalAlert();
    }
    setLastUpdated(new Date());
  }, []);

  // ── Add a single signal pushed from SSE to the board ─────────────────────
  const addSignalFromPush = useCallback((incoming: Signal) => {
    if (!shouldShow(incoming)) return;
    setDisplaySignals((prev) => {
      // Don't add duplicates
      if (prev.some((s) => s._id === incoming._id)) return prev;
      triggerNewSignalAlert();
      return [incoming, ...prev]; // prepend so newest is first
    });
    // Refresh stats quietly so the stats bar reflects the new signal
    signalApi.stats().then((r) => setStats(r.data)).catch(() => {});
  }, [triggerNewSignalAlert]);

  // ── Full data fetch (initial load + manual refresh) ───────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [liveRes, statsRes] = await Promise.all([
        signalApi.live(),
        signalApi.stats(),
      ]);

      const liveSignals: Signal[] = liveRes.data.signals ?? [];
      const merged = liveSignals.filter(shouldShow);

      // Detect brand-new IDs on silent refreshes (fallback path)
      if (hasFetchedOnce.current) {
        const brandNew = merged.filter((s) => !prevSignalIds.current.has(s._id));
        if (brandNew.length > 0) triggerNewSignalAlert();
      }

      prevSignalIds.current = new Set(merged.map((s) => s._id));
      hasFetchedOnce.current = true;

      setDisplaySignals(merged);
      setStats(statsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [triggerNewSignalAlert]);

  // ── SSE connection — receives signal pushes instantly ─────────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      // Pass token as query param (EventSource doesn't support custom headers)
      const es = new EventSource(`${API_URL}/api/signals/stream?token=${token}`);
      sseRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        console.log('[SSE] Connected');
      };

      es.addEventListener('signal', (e: MessageEvent) => {
        try {
          const signal: Signal = JSON.parse(e.data);
          console.log('[SSE] New signal received:', signal.asset, signal.direction);
          addSignalFromPush(signal);
        } catch { /* ignore malformed */ }
      });

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        sseRef.current = null;
        // Auto-reconnect after 5s
        retryTimeout = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      sseRef.current?.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [addSignalFromPush]);

  // ── Initial load + fallback poll every 30s ────────────────────────────────
  // The poll is a safety net in case SSE misses an event (e.g. reconnect gap).
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleManualRefresh = useCallback(async () => {
    setDisplaySignals([]);
    prevSignalIds.current = new Set();
    await fetchData(true);
  }, [fetchData]);

  const handleResult = useCallback((id: string) => {
    setDisplaySignals((prev) => prev.filter((s) => s._id !== id));
    setTimeout(() => signalApi.stats().then((r) => setStats(r.data)).catch(() => {}), 800);
  }, []);

  const handleCancel = useCallback((id: string) => {
    setDisplaySignals((prev) => prev.filter((s) => s._id !== id));
  }, []);

  const engineSignals = displaySignals.filter((s) => s.generatedBy === 'engine');
  const manualSignals = displaySignals.filter((s) => s.generatedBy === 'manual');

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            Live trading signals
            {/* SSE connection indicator */}
            <span className={`inline-flex items-center gap-1 text-xs ${sseConnected ? 'text-emerald-400' : 'text-yellow-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
              {sseConnected ? 'Live' : 'Connecting...'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <EngineStatusBar />
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Sound on' : 'Sound off'}
          </button>
          <button
            onClick={() => { unlockAudio(); playSignalAlert(); }}
            title="Test notification sound"
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors active:scale-95"
          >
            <Volume2 className="w-4 h-4 text-yellow-400" />
            Test sound
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* New signal flash */}
      {newSignalFlash && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-pulse">
          <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">
            New signal received!
          </p>
          {lastUpdated && (
            <span className="ml-auto text-xs text-emerald-600">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <Loader text="Fetching live signals..." />
      ) : displaySignals.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
          <Zap className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No signals right now</p>
          <p className="text-gray-500 text-sm mt-1">
            Waiting for Stochastic + RSI + MACD to align...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {engineSignals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">AI Engine Signals</h2>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                  {engineSignals.length}
                </span>
                {lastUpdated && (
                  <span className="ml-auto text-xs text-gray-500">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {engineSignals.map((signal) => (
                  <SignalCard key={signal._id} signal={signal} onResult={handleResult} onCancel={handleCancel} />
                ))}
              </div>
            </section>
          )}

          {manualSignals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Manual Signals</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  {manualSignals.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {manualSignals.map((signal) => (
                  <SignalCard key={signal._id} signal={signal} onResult={handleResult} onCancel={handleCancel} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
