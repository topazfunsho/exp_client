'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signalApi, Signal, SignalPayload } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import SignalCard from '@/components/SignalCard';
import SignalModal from '@/components/SignalModal';
import EngineStatusBar from '@/components/EngineStatus';
import Loader from '@/components/Loader';
import { Plus, ShieldCheck, AlertTriangle, Cpu, User, RefreshCw } from 'lucide-react';

const RESULT_OPTIONS = ['win', 'loss', 'draw'] as const;
const STATUS_OPTIONS = ['active', 'expired', 'won', 'lost'] as const;

type Tab = 'engine' | 'manual';

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab]               = useState<Tab>('engine');
  const [signals, setSignals]       = useState<Signal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Signal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [quickUpdate, setQuickUpdate] = useState<{
    id: string; status: string; result: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard');
  }, [isAdmin, authLoading, router]);

  const fetchSignals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await signalApi.list({ limit: 50 });
      setSignals(res.data.signals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSignals();
      // Auto-refresh every 15s to pick up new engine signals
      const interval = setInterval(() => fetchSignals(true), 15_000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchSignals]);

  const handleCreate = async (data: SignalPayload) => {
    await signalApi.create(data);
    await fetchSignals();
  };

  const handleEdit = async (data: SignalPayload) => {
    if (!editTarget) return;
    await signalApi.update(editTarget._id, data);
    await fetchSignals();
  };

  const handleDelete = async (id: string) => {
    await signalApi.delete(id);
    setDeleteConfirm(null);
    await fetchSignals();
  };

  const handleQuickUpdate = async () => {
    if (!quickUpdate) return;
    await signalApi.update(quickUpdate.id, {
      status: quickUpdate.status as Signal['status'],
      result: quickUpdate.result as Signal['result'],
    });
    setQuickUpdate(null);
    await fetchSignals();
  };

  if (authLoading) return <Loader />;
  if (!isAdmin) return null;

  const engineSignals = signals.filter((s) => s.generatedBy === 'engine');
  const manualSignals = signals.filter((s) => s.generatedBy === 'manual');
  const displayed     = tab === 'engine' ? engineSignals : manualSignals;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Manage & monitor trading signals</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <EngineStatusBar />
          <button
            onClick={() => fetchSignals(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Signal
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900 border border-gray-800 rounded-2xl w-fit">
        <button
          onClick={() => setTab('engine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'engine'
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          AI Engine
          <span className={`px-1.5 py-0.5 rounded text-xs ${
            tab === 'engine' ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-800 text-gray-500'
          }`}>
            {engineSignals.length}
          </span>
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'manual'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          Manual
          <span className={`px-1.5 py-0.5 rounded text-xs ${
            tab === 'manual' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-800 text-gray-500'
          }`}>
            {manualSignals.length}
          </span>
        </button>
      </div>

      {/* Engine tab info banner */}
      {tab === 'engine' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
          <Cpu className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <p className="text-purple-300 text-sm">
            These signals are auto-generated every minute by the AI engine using RSI, MACD, Bollinger Bands, Stochastic, CCI and EMA crossover analysis across 12 pairs. You can update their result after expiry.
          </p>
        </div>
      )}

      {/* Signals grid */}
      {loading ? (
        <Loader text="Loading signals..." />
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
          {tab === 'engine' ? (
            <>
              <Cpu className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No engine signals yet</p>
              <p className="text-gray-500 text-sm mt-1">
                The engine fires every minute — signals will appear here automatically
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-medium">No manual signals yet</p>
              <p className="text-gray-500 text-sm mt-1">Create your first signal above</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((signal) => (
            <div key={signal._id}>
              <SignalCard
                signal={signal}
                isAdmin
                onEdit={(s) => { setEditTarget(s); setModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm(id)}
              />
              <button
                onClick={() => setQuickUpdate({
                  id: signal._id,
                  status: signal.status,
                  result: signal.result ?? '',
                })}
                className="w-full mt-1 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Set result / status
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <SignalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={editTarget ? handleEdit : handleCreate}
        initial={editTarget}
      />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Delete Signal?</h3>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick update modal */}
      {quickUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-4">Update Signal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuickUpdate({ ...quickUpdate, status: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors ${
                        quickUpdate.status === s
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Result</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuickUpdate({ ...quickUpdate, result: '' })}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      quickUpdate.result === ''
                        ? 'bg-gray-600 text-white border-gray-500'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    None
                  </button>
                  {RESULT_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuickUpdate({ ...quickUpdate, result: r })}
                      className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors ${
                        quickUpdate.result === r
                          ? r === 'win'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : r === 'loss'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setQuickUpdate(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickUpdate}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
