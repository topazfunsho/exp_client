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

// Shared signal status badge styles (neutral — not user-specific)
const statusStyles: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expired:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
  won:       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lost:      'bg-red-500/20 text-red-400 border-red-500/30',
  skipped:   'bg-gray-700/30 text-gray-600 border-gray-700/30',
  cancelled: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// User's personal result badge styles
const userResultStyles: Record<string, string> = {
  win:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  loss: 'bg-red-500/20 text-red-400 border-red-500/30',
  draw: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

function secsUntil(iso: string) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}
function pad(n: number) { return String(n).padStart(2, '0'); }
function formatSecs(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${pad(m)}:${pad(s % 60)}` : `${pad(s)}s`;
}

export default function SignalCard({ signal, isAdmin, onResult, onCancel, onEdit, onDelete }: Props) {
  const isBuy    = signal.direction === 'BUY';
  const isEngine = signal.generatedBy === 'engine';

  // ── Live countdown ──────────────────────────────────────────────────────────
  const [entrySecsLeft,  setEntrySecsLeft]  = useState(() => secsUntil(signal.entryTime));
  const [expirySecsLeft, setExpirySecsLeft] = useState(() => secsUntil(signal.expiryTime));

  useEffect(() => {
    const t = setInterval(() => {
      setEntrySecsLeft(secsUntil(signal.entryTime));
      setExpirySecsLeft(secsUntil(signal.expiryTime));
    }, 1000);
    return () => clearInterval(t);
  }, [signal.entryTime, signal.expiryTime]);

  // ── Phase logic (client-side, based on live timers) ─────────────────────────
  const isPending = signal.status === 'pending' && entrySecsLeft > 0;
  const isActive  = signal.status === 'active'  || (signal.status === 'pending' && entrySecsLeft === 0);

  // ── Per-user state ──────────────────────────────────────────────────────────
  // userStatus/userResult come from the backend overlay — they are THIS user's
  // personal interaction, invisible to other users.
  const userActed     = signal.userStatus !== null;          // user already did something
  const userCancelled = signal.userStatus === 'cancelled';
  const userHasResult = signal.userResult !== null;

  // Show WIN/LOSS buttons when:
  //  - signal is active (entry time passed, trade window open)
  //  - user hasn't recorded a result yet
  //  - user hasn't cancelled
  const showResultButtons = isActive && !userHasResult && !userCancelled;

  // Show CANCEL button when:
  //  - signal is pending or active
  //  - user hasn't acted yet
  const showCancelButton = (isPending || isActive) && !userActed;

  // ── Actions ─────────────────────────────────────────────────────────────────
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
      } ${userCancelled ? 'opacity-50' : ''}`}
    >
      {/* Top glow strip */}
      {(isPending || isActive) && !userCancelled && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${
          isPending ? 'bg-yellow-500' : isBuy ? 'bg-emerald-500' : 'bg-red-500'
        }`} />
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

        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {signal.direction}
        </span>
      </div>

      {/* Entry / Expiry timers */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-xl p-3 text-center border ${
          isPending ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-gray-800/80 border-transparent'
        }`}>
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Timer className="w-3 h-3" />{isPending ? 'Opens in' : 'Entry at'}
          </p>
          {isPending ? (
            <p className={`font-bold text-sm tabular-nums ${entrySecsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
              {formatSecs(entrySecsLeft)}
            </p>
          ) : (
            <p className="text-white font-semibold text-xs tabular-nums">
              {new Date(signal.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>

        <div className="bg-gray-800/80 rounded-xl p-3 text-center border border-transparent">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />{isActive && expirySecsLeft > 0 ? 'Closes in' : 'Expires at'}
          </p>
          {isActive && expirySecsLeft > 0 ? (
            <p className={`font-bold text-sm tabular-nums ${expirySecsLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
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
          }`}>{signal.confidence}%</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${
          signal.confidence >= 75 ? 'bg-emerald-500' :
          signal.confidence >= 55 ? 'bg-yellow-500' : 'bg-red-500'
        }`} style={{ width: `${signal.confidence}%` }} />
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
          isEngine ? 'bg-gray-800/60 text-gray-300 border border-gray-700/50' : 'text-gray-400 border-l-2 border-gray-700 pl-3'
        }`}>
          {isEngine ? (
            <div className="space-y-0.5">
              {signal.notes.split(' | ').map((note, i) => <p key={i} className="leading-relaxed">{note}</p>)}
            </div>
          ) : (
            <p className="italic">{signal.notes}</p>
          )}
        </div>
      )}

      {/* Footer: signal status + user's personal result */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        {/* Shared signal status */}
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusStyles[signal.status]}`}>
          {signal.status}
        </span>

        {/* User's personal result — only visible to this user */}
        {signal.userResult && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${userResultStyles[signal.userResult]}`}>
            You: {signal.userResult}
          </span>
        )}
        {userCancelled && !signal.userResult && (
          <span className="text-xs text-orange-400 font-medium">You cancelled</span>
        )}
      </div>

      {/* ── CANCEL button ─────────────────────────────────────────────────────── */}
      {showCancelButton && (
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

      {/* ── WIN / LOSS / DRAW buttons ─────────────────────────────────────────── */}
      {showResultButtons && (
        <div className="pt-1 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-400 text-center font-medium">
            {expirySecsLeft > 0 ? 'Trade open — record your result:' : 'Trade closed — how did it go?'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['win', 'loss', 'draw'] as const).map((r) => {
              const styles = {
                win:  { active: 'bg-emerald-500 text-black border-emerald-500', idle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/60' },
                loss: { active: 'bg-red-500 text-white border-red-500',         idle: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/25 hover:border-red-500/60' },
                draw: { active: 'bg-yellow-500 text-black border-yellow-500',   idle: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25 hover:border-yellow-500/60' },
              };
              const icons = { win: Trophy, loss: XCircle, draw: Minus };
              const Icon = icons[r];
              return (
                <button
                  key={r}
                  onClick={() => handleResult(r)}
                  disabled={!!submitting}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                    submitting === r ? styles[r].active + ' scale-95' : styles[r].idle
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {r.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex gap-2 pt-1 border-t border-gray-800">
          <button onClick={() => onEdit?.(signal)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-blue-400 hover:bg-blue-400/10 transition-colors border border-blue-400/20">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onDelete?.(signal._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/20">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
