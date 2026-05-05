'use client';

import { useState, useEffect } from 'react';
import { Signal, setSignalResult, cancelSignal as cancelSignalApi } from '@/lib/api';
import {
  TrendingUp, TrendingDown, Clock, Target, BarChart2,
  Trash2, Pencil, Cpu, User, Trophy, XCircle, Minus, Ban, Timer,
} from 'lucide-react';

interface Props {
  signal: Signal;
  isAdmin?: boolean;
  onResult?: (id: string, result: 'win' | 'loss' | 'draw') => void;
  onCancel?: (id: string) => void;
  onEdit?: (signal: Signal) => void;
  onDelete?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expired:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
  won:       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lost:      'bg-red-500/20 text-red-400 border-red-500/30',
  skipped:   'bg-gray-700/30 text-gray-600 border-gray-700/30',
  cancelled: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const resultStyles: Record<string, string> = {
  win:  'text-emerald-400',
  loss: 'text-red-400',
  draw: 'text-yellow-400',
};

/** Returns seconds remaining until a target date, or 0 if past */
function secsUntil(iso: string) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatSecs(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${pad(m)}:${pad(sec)}` : `${pad(sec)}s`;
}

export default function SignalCard({ signal, isAdmin, onResult, onCancel, onEdit, onDelete }: Props) {
  const isBuy    = signal.direction === 'BUY';
  const isEngine = signal.generatedBy === 'engine';

  // ── Live countdown state ────────────────────────────────────────────────────
  const [entrySecsLeft,  setEntrySecsLeft]  = useState(() => secsUntil(signal.entryTime));
  const [expirySecsLeft, setExpirySecsLeft] = useState(() => secsUntil(signal.expiryTime));

  useEffect(() => {
    const t = setInterval(() => {
      setEntrySecsLeft(secsUntil(signal.entryTime));
      setExpirySecsLeft(secsUntil(signal.expiryTime));
    }, 1000);
    return () => clearInterval(t);
  }, [signal.entryTime, signal.expiryTime]);

  // Derived phase based on live timers (client-side truth)
  const isPending  = signal.status === 'pending' && entrySecsLeft > 0;
  const isActive   = signal.status === 'active'  || (signal.status === 'pending' && entrySecsLeft === 0);
  const isExpired  = signal.status === 'expired' || (isActive && expirySecsLeft === 0);
  const needsResult = !signal.result && (isActive || isExpired) && signal.status !== 'cancelled';

  // ── Action state ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState<'win' | 'loss' | 'draw' | 'cancel' | null>(null);

  const handleResult = async (result: 'win' | 'loss' | 'draw') => {
    setSubmitting(result);
    try {
      await setSignalResult(signal._id, result);
      onResult?.(signal._id, result);
    } catch (err) {
      console.error('Failed to set result', err);
    } finally {
      setSubmitting(null);
    }
  };

  const handleCancel = async () => {
    setSubmitting('cancel');
    try {
      await cancelSignalApi(signal._id);
      onCancel?.(signal._id);
    } catch (err) {
      console.error('Failed to cancel signal', err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      className={`relative bg-gray-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-lg hover:shadow-black/30 ${
        isBuy
          ? 'border-emerald-500/30 hover:border-emerald-500/60'
          : 'border-red-500/30 hover:border-red-500/60'
      } ${signal.status === 'cancelled' ? 'opacity-60' : ''}`}
    >
      {/* Top glow strip — yellow when pending, coloured when active */}
      {(isPending || isActive) && signal.status !== 'cancelled' && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-colors ${
            isPending
              ? 'bg-yellow-500'
              : isBuy
              ? 'bg-emerald-500'
              : 'bg-red-500'
          }`}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-lg leading-tight">{signal.asset}</h3>
            {isEngine ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-semibold rounded border border-purple-500/30">
                <Cpu className="w-2.5 h-2.5" /> AI
              </span>
            ) : (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-700/60 text-gray-400 text-[10px] font-semibold rounded border border-gray-600/40">
                <User className="w-2.5 h-2.5" /> Manual
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            {isEngine ? 'Auto-generated' : `by ${signal.createdBy?.name ?? 'Admin'}`}
          </p>
        </div>

        <span
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
            isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {signal.direction}
        </span>
      </div>

      {/* ── Entry / Expiry time row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Entry time */}
        <div className={`rounded-xl p-3 text-center border ${
          isPending
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-gray-800/80 border-transparent'
        }`}>
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Timer className="w-3 h-3" />
            {isPending ? 'Opens in' : 'Entry at'}
          </p>
          {isPending ? (
            <p className={`font-bold text-sm tabular-nums ${
              entrySecsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
            }`}>
              {formatSecs(entrySecsLeft)}
            </p>
          ) : (
            <p className="text-white font-semibold text-xs tabular-nums">
              {new Date(signal.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>

        {/* Expiry / trade countdown */}
        <div className={`rounded-xl p-3 text-center border ${
          isActive && expirySecsLeft > 0
            ? 'bg-gray-800/80 border-transparent'
            : 'bg-gray-800/40 border-transparent'
        }`}>
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            {isActive && expirySecsLeft > 0 ? 'Closes in' : 'Expires at'}
          </p>
          {isActive && expirySecsLeft > 0 ? (
            <p className={`font-bold text-sm tabular-nums ${
              expirySecsLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
            }`}>
              {formatSecs(expirySecsLeft)}
            </p>
          ) : (
            <p className="text-white font-semibold text-xs tabular-nums">
              {new Date(signal.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/80 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Target className="w-3 h-3" /> Entry
          </p>
          <p className="text-white font-semibold text-sm tabular-nums">
            {signal.entryPrice.toFixed(signal.entryPrice > 100 ? 2 : 5)}
          </p>
        </div>
        <div className="bg-gray-800/80 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Frame
          </p>
          <p className="text-white font-semibold text-sm">{signal.timeframe}</p>
        </div>
        <div className="bg-gray-800/80 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <BarChart2 className="w-3 h-3" /> Conf.
          </p>
          <p className={`font-bold text-sm ${
            signal.confidence >= 75 ? 'text-emerald-400' :
            signal.confidence >= 55 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {signal.confidence}%
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            signal.confidence >= 75 ? 'bg-emerald-500' :
            signal.confidence >= 55 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>

      {/* Indicators */}
      {signal.indicators?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {signal.indicators.map((ind) => (
            <span key={ind} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700">
              {ind}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {signal.notes && (
        <div className={`text-xs rounded-xl px-3 py-2 ${
          isEngine
            ? 'bg-gray-800/60 text-gray-300 border border-gray-700/50'
            : 'text-gray-400 border-l-2 border-gray-700 pl-3'
        }`}>
          {isEngine ? (
            <div className="space-y-0.5">
              {signal.notes.split(' | ').map((note, i) => (
                <p key={i} className="leading-relaxed">{note}</p>
              ))}
            </div>
          ) : (
            <p className="italic">{signal.notes}</p>
          )}
        </div>
      )}

      {/* Footer: status badge + result */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusStyles[signal.status]}`}>
          {signal.status}
        </span>
        {signal.result && (
          <span className={`text-xs font-bold uppercase ${resultStyles[signal.result]}`}>
            {signal.result}
          </span>
        )}
      </div>

      {/* ── CANCEL button — shown while pending or active, no result yet ──────── */}
      {(isPending || (isActive && !needsResult === false)) && !signal.result && signal.status !== 'cancelled' && !needsResult && (
        // This branch: pending and not yet needing result
        null
      )}

      {/* Cancel: show when pending or active and no result yet */}
      {(signal.status === 'pending' || signal.status === 'active') && !signal.result && (
        <div className="pt-1 border-t border-gray-800">
          <button
            onClick={handleCancel}
            disabled={!!submitting}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
              submitting === 'cancel'
                ? 'bg-orange-500/30 text-orange-300 border-orange-500/50 scale-95'
                : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 active:scale-95'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Ban className="w-3.5 h-3.5" />
            {submitting === 'cancel' ? 'Cancelling...' : "Don't use this signal"}
          </button>
        </div>
      )}

      {/* ── WIN / LOSS / DRAW buttons — shown after entry time, before result ── */}
      {needsResult && (
        <div className="pt-1 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-400 text-center font-medium">
            {expirySecsLeft > 0 ? 'Trade open — record result when done:' : 'Trade closed — how did it go?'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleResult('win')}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                submitting === 'win'
                  ? 'bg-emerald-500 text-black border-emerald-500 scale-95'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/60 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Trophy className="w-3.5 h-3.5" /> WIN
            </button>

            <button
              onClick={() => handleResult('loss')}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                submitting === 'loss'
                  ? 'bg-red-500 text-white border-red-500 scale-95'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/25 hover:border-red-500/60 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <XCircle className="w-3.5 h-3.5" /> LOSS
            </button>

            <button
              onClick={() => handleResult('draw')}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                submitting === 'draw'
                  ? 'bg-yellow-500 text-black border-yellow-500 scale-95'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25 hover:border-yellow-500/60 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Minus className="w-3.5 h-3.5" /> DRAW
            </button>
          </div>
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex gap-2 pt-1 border-t border-gray-800">
          <button
            onClick={() => onEdit?.(signal)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-blue-400 hover:bg-blue-400/10 transition-colors border border-blue-400/20"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => onDelete?.(signal._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/20"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
