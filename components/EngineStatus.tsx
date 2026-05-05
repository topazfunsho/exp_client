'use client';

import { useEffect, useState, useCallback } from 'react';
import { engineApi, EngineStatus } from '@/lib/api';
import { Cpu, Clock, Wifi, WifiOff } from 'lucide-react';

export default function EngineStatusBar() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [error, setError] = useState(false);
  // Local countdown in seconds derived from nextSignalIn
  const [countdown, setCountdown] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await engineApi.status();
      setStatus(res.data);
      setError(false);
      // Parse "Xs" string from backend into a number
      const match = String(res.data.nextSignalIn).match(/(\d+)/);
      if (match) setCountdown(parseInt(match[1]));
    } catch {
      setError(true);
    }
  }, []);

  // Poll engine status every 10 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Local tick-down every second
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      fetchStatus(); // refresh when timer hits 0
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, fetchStatus]);

  const isUrgent = countdown !== null && countdown <= 10;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-2xl">
      {/* Engine indicator */}
      <div className="flex items-center gap-2">
        {error ? (
          <WifiOff className="w-4 h-4 text-red-400" />
        ) : status?.status === 'paused' ? (
          <Cpu className="w-4 h-4 text-yellow-400" />
        ) : (
          <div className="relative flex items-center justify-center">
            <span className="absolute w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-60" />
            <Cpu className="w-4 h-4 text-emerald-400 relative z-10" />
          </div>
        )}
        <span
          className={`text-xs font-medium ${
            error
              ? 'text-red-400'
              : status?.status === 'paused'
              ? 'text-yellow-400'
              : 'text-emerald-400'
          }`}
        >
          {error ? 'Engine offline' : status?.status === 'paused' ? 'Engine paused' : 'Engine running'}
        </span>
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* Next signal countdown */}
      <div className="flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-yellow-400' : 'text-gray-400'}`} />
        <span className={`text-xs font-mono font-semibold ${isUrgent ? 'text-yellow-400' : 'text-gray-300'}`}>
          {countdown !== null
            ? `Next signal in ${countdown}s`
            : status?.nextSignalIn
            ? `Next signal in ${status.nextSignalIn}`
            : '—'}
        </span>
      </div>

      {/* Latest signal pair */}
      {status?.latestSignal && (
        <>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Last:</span>
            <span className="text-xs font-semibold text-white">
              {status.latestSignal.asset}
            </span>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                status.latestSignal.direction === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {status.latestSignal.direction}
            </span>
            <span className="text-xs text-gray-500">
              {status.latestSignal.confidence}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
