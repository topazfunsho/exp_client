'use client';

import { useEffect, useState, useCallback } from 'react';
import { signalApi, Signal } from '@/lib/api';
import SignalCard from '@/components/SignalCard';
import Loader from '@/components/Loader';
import { Search, Filter, ChevronLeft, ChevronRight, Cpu, User } from 'lucide-react';

const STATUS_OPTIONS = ['all', 'pending', 'active', 'won', 'lost', 'skipped', 'cancelled'] as const;
const SOURCE_OPTIONS = [
  { value: 'all',    label: 'All',    icon: null },
  { value: 'engine', label: 'AI Engine', icon: Cpu },
  { value: 'manual', label: 'Manual',    icon: User },
] as const;

type Source = 'all' | 'engine' | 'manual';

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);

  const [filters, setFilters] = useState({
    status:      'all' as string,
    source:      'all' as Source,
    asset:       '',
    page:        1,
    limit:       12,
  });

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page:  filters.page,
        limit: filters.limit,
        mine:  true,   // always scope to this user's signals only
      };
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.asset.trim())     params.asset  = filters.asset.trim();
      if (filters.source !== 'all') params.generatedBy = filters.source;

      const res = await signalApi.list(params as Parameters<typeof signalApi.list>[0]);
      setSignals(res.data.signals);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const setPage = (p: number) => setFilters((f) => ({ ...f, page: p }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Signals</h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} signal{total !== 1 ? 's' : ''} you have traded
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + status */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search asset (e.g. EUR/USD, BTC/USD)"
              value={filters.asset}
              onChange={(e) => setFilters((f) => ({ ...f, asset: e.target.value, page: 1 }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilters((f) => ({ ...f, status: s, page: 1 }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  filters.status === s
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: source filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Source:</span>
          <div className="flex gap-2">
            {SOURCE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFilters((f) => ({ ...f, source: value as Source, page: 1 }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filters.source === value
                    ? value === 'engine'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <Loader text="Loading signals..." />
      ) : signals.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
          <p className="text-gray-400 font-medium">No signals found</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((signal) => (
            <SignalCard key={signal._id} signal={signal} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(filters.page - 1)}
            disabled={filters.page === 1}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            // Show pages around current page
            const p = filters.page <= 4
              ? i + 1
              : filters.page >= pages - 3
              ? pages - 6 + i
              : filters.page - 3 + i;
            if (p < 1 || p > pages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === filters.page
                    ? 'bg-emerald-500 text-black'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => setPage(filters.page + 1)}
            disabled={filters.page === pages}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
