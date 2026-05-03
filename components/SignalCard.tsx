'use client';

import { Signal } from '@/lib/api';
import { TrendingUp, TrendingDown, Clock, Target, BarChart2, Trash2, Pencil } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

interface Props {
  signal: Signal;
  isAdmin?: boolean;
  onEdit?: (signal: Signal) => void;
  onDelete?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  won: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const resultStyles: Record<string, string> = {
  win: 'text-emerald-400',
  loss: 'text-red-400',
  draw: 'text-yellow-400',
};

export default function SignalCard({ signal, isAdmin, onEdit, onDelete }: Props) {
  const isBuy = signal.direction === 'BUY';

  return (
    <div
      className={`relative bg-gray-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-lg hover:shadow-black/30 ${
        isBuy ? 'border-emerald-500/30' : 'border-red-500/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-bold text-lg leading-tight">{signal.asset}</h3>
          <p className="text-gray-400 text-xs mt-0.5">
            by {signal.createdBy?.name ?? 'Admin'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Direction badge */}
          <span
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
              isBuy
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {signal.direction}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Target className="w-3 h-3" /> Entry
          </p>
          <p className="text-white font-semibold text-sm">{signal.entryPrice}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Frame
          </p>
          <p className="text-white font-semibold text-sm">{signal.timeframe}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1 flex items-center justify-center gap-1">
            <BarChart2 className="w-3 h-3" /> Conf.
          </p>
          <p className="text-white font-semibold text-sm">{signal.confidence}%</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Confidence</span>
          <span>{signal.confidence}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              signal.confidence >= 75
                ? 'bg-emerald-500'
                : signal.confidence >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
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
        <p className="text-gray-400 text-xs italic border-l-2 border-gray-700 pl-3">
          {signal.notes}
        </p>
      )}

      {/* Footer */}
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
