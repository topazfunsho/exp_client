'use client';

import { Stats } from '@/lib/api';
import { Trophy, XCircle, Minus, Clock, TrendingUp } from 'lucide-react';

interface Props {
  stats: Stats;
}

export default function StatsBar({ stats }: Props) {
  const items = [
    {
      label: 'Win Rate',
      value: stats.winRate,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Wins',
      value: stats.win,
      icon: Trophy,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Losses',
      value: stats.loss,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Draws',
      value: stats.draw,
      icon: Minus,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total',
      value: stats.total,
      icon: TrendingUp,
      color: 'text-gray-300',
      bg: 'bg-gray-700/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`${bg} rounded-2xl p-4 flex flex-col items-center gap-1 border border-gray-800`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-gray-400 text-xs">{label}</p>
        </div>
      ))}
    </div>
  );
}
