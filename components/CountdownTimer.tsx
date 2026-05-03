'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  expiryTime: string;
}

function getTimeLeft(expiryTime: string) {
  const diff = new Date(expiryTime).getTime() - Date.now();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return { h, m, s, totalSeconds };
}

export default function CountdownTimer({ expiryTime }: Props) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(expiryTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(expiryTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  if (!timeLeft) {
    return <span className="text-xs text-gray-500">Expired</span>;
  }

  const isUrgent = timeLeft.totalSeconds < 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span
      className={`flex items-center gap-1 text-xs font-mono font-semibold ${
        isUrgent ? 'text-red-400 animate-pulse' : 'text-emerald-400'
      }`}
    >
      <Clock className="w-3 h-3" />
      {timeLeft.h > 0 && `${pad(timeLeft.h)}:`}
      {pad(timeLeft.m)}:{pad(timeLeft.s)}
    </span>
  );
}
