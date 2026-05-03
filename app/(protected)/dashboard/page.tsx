'use client';

import { useEffect, useState, useCallback } from 'react';
import { signalApi, Signal, Stats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import SignalCard from '@/components/SignalCard';
import StatsBar from '@/components/StatsBar';
import Loader from '@/components/Loader';
import { RefreshCw, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [liveSignals, setLiveSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [liveRes, statsRes] = await Promise.all([
        signalApi.live(),
        signalApi.stats(),
      ]);
      setLiveSignals(liveRes.data.signals);
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
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Live trading signals — updated in real time
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Live signals */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Live Signals</h2>
          {liveSignals.length > 0 && (
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
              {liveSignals.length} active
            </span>
          )}
          {lastUpdated && (
            <span className="ml-auto text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading ? (
          <Loader text="Fetching live signals..." />
        ) : liveSignals.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
            <Zap className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No live signals right now</p>
            <p className="text-gray-500 text-sm mt-1">Check back soon or refresh the page</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveSignals.map((signal) => (
              <SignalCard key={signal._id} signal={signal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
