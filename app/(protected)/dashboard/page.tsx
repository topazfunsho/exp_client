'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { signalApi, Signal, Stats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import SignalCard from '@/components/SignalCard';
import StatsBar from '@/components/StatsBar';
import EngineStatusBar from '@/components/EngineStatus';
import Loader from '@/components/Loader';
import { playSignalAlert, unlockAudio } from '@/lib/sound';
import { RefreshCw, Zap, Cpu, TrendingUp, Volume2 } from 'lucide-react';

// Only show pending and active signals — expired ones are removed immediately
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
  const prevSignalIds = useRef<Set<string>>(new Set());

  // Unlock AudioContext on first user interaction with the page
  useEffect(() => {
    const unlock = () => { unlockAudio(); };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [liveRes, statsRes] = await Promise.all([
        signalApi.live(),
        signalApi.stats(),
      ]);

      const liveSignals: Signal[] = liveRes.data.signals ?? [];

      const seen = new Set<string>();
      const merged: Signal[] = [];
      for (const s of liveSignals) {
        if (!seen.has(s._id) && shouldShow(s)) {
          seen.add(s._id);
          merged.push(s);
        }
      }

      // Flash banner + sound when a brand-new signal arrives
      const newIds = liveSignals.map((s) => s._id);
      const hasNew = newIds.some((id) => !prevSignalIds.current.has(id));
      if (hasNew && prevSignalIds.current.size > 0) {
        setNewSignalFlash(true);
        setTimeout(() => setNewSignalFlash(false), 3000);
        if (soundEnabled) playSignalAlert();
      }
      prevSignalIds.current = new Set(newIds);

      setDisplaySignals(merged);
      setStats(statsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Clears all signals immediately, then fetches fresh from server
  const handleManualRefresh = useCallback(async () => {
    setDisplaySignals([]);
    prevSignalIds.current = new Set();
    await fetchData(true);
  }, [fetchData]);

  // Remove card after user marks WIN / LOSS / DRAW
  const handleResult = useCallback((id: string) => {
    setDisplaySignals((prev) => prev.filter((s) => s._id !== id));
    setTimeout(() => fetchData(true), 800);
  }, [fetchData]);

  // Remove card after user cancels the signal
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
          <p className="text-gray-400 text-sm mt-1">
            Live trading signals — auto-generated every minute
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <EngineStatusBar />
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Mute signal alerts' : 'Unmute signal alerts'}
            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            {soundEnabled ? 'Sound on' : 'Sound off'}
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

      {/* New signal flash banner */}
      {newSignalFlash && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-pulse">
          <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">
            New signal generated by the engine!
          </p>
        </div>
      )}

      {loading ? (
        <Loader text="Fetching live signals..." />
      ) : displaySignals.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
          <Zap className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No signals right now</p>
          <p className="text-gray-500 text-sm mt-1">
            The engine generates a new signal every minute — check back soon
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* AI Engine signals */}
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
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {engineSignals.map((signal) => (
                  <SignalCard
                    key={signal._id}
                    signal={signal}
                    onResult={handleResult}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Manual signals */}
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
                  <SignalCard
                    key={signal._id}
                    signal={signal}
                    onResult={handleResult}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
