'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Signal, SignalPayload } from '@/lib/api';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SignalPayload) => Promise<void>;
  initial?: Signal | null;
}

const TIMEFRAMES = ['30s', '1m', '2m', '5m', '15m', '30m', '1h'];
const COMMON_INDICATORS = ['RSI', 'MACD', 'Bollinger Bands', 'EMA', 'SMA', 'Stochastic', 'ATR'];

const toLocalDatetimeValue = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  // format: YYYY-MM-DDTHH:mm
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function SignalModal({ open, onClose, onSubmit, initial }: Props) {
  const [form, setForm] = useState<SignalPayload>({
    asset: '',
    direction: 'BUY',
    timeframe: '1m',
    entryPrice: 0,
    expiryTime: '',
    confidence: 70,
    indicators: [],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        asset: initial.asset,
        direction: initial.direction,
        timeframe: initial.timeframe,
        entryPrice: initial.entryPrice,
        expiryTime: toLocalDatetimeValue(initial.expiryTime),
        confidence: initial.confidence,
        indicators: initial.indicators ?? [],
        notes: initial.notes ?? '',
      });
    } else {
      setForm({
        asset: '',
        direction: 'BUY',
        timeframe: '1m',
        entryPrice: 0,
        expiryTime: '',
        confidence: 70,
        indicators: [],
        notes: '',
      });
    }
    setError('');
  }, [initial, open]);

  const toggleIndicator = (ind: string) => {
    setForm((prev) => ({
      ...prev,
      indicators: prev.indicators?.includes(ind)
        ? prev.indicators.filter((i) => i !== ind)
        : [...(prev.indicators ?? []), ind],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Convert local datetime to ISO
      const payload = {
        ...form,
        expiryTime: new Date(form.expiryTime).toISOString(),
      };
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg">
            {initial ? 'Edit Signal' : 'Create Signal'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Asset */}
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Asset</label>
            <input
              required
              value={form.asset}
              onChange={(e) => setForm({ ...form, asset: e.target.value })}
              placeholder="e.g. EUR/USD, BTC/USD, Gold"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Direction + Timeframe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Direction</label>
              <select
                value={form.direction}
                onChange={(e) =>
                  setForm({ ...form, direction: e.target.value as 'BUY' | 'SELL' })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Timeframe</label>
              <select
                value={form.timeframe}
                onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {TIMEFRAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Entry Price + Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Entry Price</label>
              <input
                required
                type="number"
                step="any"
                value={form.entryPrice}
                onChange={(e) => setForm({ ...form, entryPrice: parseFloat(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Expiry Time</label>
              <input
                required
                type="datetime-local"
                value={form.expiryTime}
                onChange={(e) => setForm({ ...form, expiryTime: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Confidence */}
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">
              Confidence: <span className="text-white font-semibold">{form.confidence}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.confidence}
              onChange={(e) => setForm({ ...form, confidence: parseInt(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Indicators */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Indicators</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_INDICATORS.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => toggleIndicator(ind)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.indicators?.includes(ind)
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Analysis notes..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : initial ? 'Update Signal' : 'Create Signal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
