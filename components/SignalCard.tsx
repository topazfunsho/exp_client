'use client';

import { useState } from 'react';
import { Signal, setSignalResult } from '@/lib/api';
import {
  TrendingUp, TrendingDown, Clock, Target, BarChart2,
  Trash2, Pencil, Cpu, User, Trophy, XCircle, Minus,
} from 'lucide-react';
import CountdownTimer from './CountdownTimer';

interface Props {
  signal: Signal;
  isAdmin?: boolean;
  /** Called after user marks a result — parent should refresh its list */
  onResult?: (id: string, result: 'win' | 'loss' | 'draw') => void;
  onEdit?: (signal: Signal) => void;
  onDelete?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  active:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  won:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lost:    'bg-red-500/20 text-red-400 border-red-500/30',
  skipped: 'bg-gray-700/30 text-gray-600 border-gray-700/30',
};

const resultStyles: Record<string, string> = {
  win:  'text-emerald-400',
  loss: 'text-red-400',
  draw: 'text-yellow-400',
};

export default function SignalCard({ signal, isAdmin, onResult, onEdit, onDelete }: Props) {
  const isBuy    = signal.direction === 'BUY';
  const isEngine = signal.generatedBy === 'engine';

  // Show result buttons when signal is expired (or active) and has no result yet
  const needsResult = !signal.result && (signal.status === 'expired' || signal.status === 'active');

  const [submitting, setSubmitting] = useState<'win' | 'loss' | 'draw' | null>(null);

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

  return (
    <div
      className={`relative bg-gray-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-lg hover:shadow-black/30 ${
        isBuy
          ? 'border-emerald-500/30 hover:border-emerald-500/60'
          : 'border-red-500/30 hover:border-red-500/60'
      }`}
    >
      {/* Engine glow strip */}
      {isEngine && signal.status === 'active' && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${
            isBuy ? 'bg-emerald-500' : 'bg-red-500'
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
          <p
            className={`font-bold text-sm ${
              signal.confidence >= 75
                ? 'text-emerald-400'
                : signal.confidence >= 55
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {signal.confidence}%
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            signal.confidence >= 75
              ? 'bg-emerald-500'
              : signal.confidence >= 55
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${signal.confidence}%` }}
        />
      </div>

      {/* Indicators */}
      {signal.indicators?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {signal.indicators.map((ind) => (
            <span
              key={ind}
              className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700"
            >
              {ind}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {signal.notes && (
        <div
          className={`text-xs rounded-xl px-3 py-2 ${
            isEngine
              ? 'bg-gray-800/60 text-gray-300 border border-gray-700/50'
              : 'text-gray-400 border-l-2 border-gray-700 pl-3'
          }`}
        >
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

      {/* Footer: status + countdown / result */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusStyles[signal.status]}`}
        >
          {signal.status}
        </span>

        <div className="flex items-center gap-3">
          {signal.result && (
            <span className={`text-xs font-bold uppercase ${resultStyles[signal.result]}`}>
              {signal.result}
            </span>
          )}
          {signal.status === 'active' && (
            <CountdownTimer expiryTime={signal.expiryTime} />
          )}
        </div>
      </div>

      {/* ── WIN / LOSS / DRAW buttons ─────────────────────────────────────────
          Shown when the signal has expired (or is still active) and the user
          hasn't recorded a result yet. The card stays visible until they click. */}
      {needsResult && (
        <div className="pt-1 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-400 text-center">
            {signal.status === 'active' ? 'Trade open — record result:' : 'How did this trade go?'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleResult('win')}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                submitting === 'win'
                  ? 'bg-emerald-500 text-black border-emerald-500 scale-95'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/60 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Trophy className="w-3.5 h-3.5" />
              WIN
            </button>

            <button
              onClick={() => handleResult('loss')}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                submitting === 'loss'
                  ? 'bg-red-500 text-white border-red-500 scale-95'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/25 hover:border-red-500/60 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <XCircle className="w-3.5 h-3.5" />
              LOSS
            </button>

            <button
              onClick={() => handleResult('draw')}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                submitting === 'draw'
                  ? 'bg-yellow-500 text-black border-yellow-500 scale-95'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25 hover:border-yellow-500/60 active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Minus className="w-3.5 h-3.5" />
              DRAW
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
