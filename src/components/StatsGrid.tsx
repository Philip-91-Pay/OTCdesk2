import { Trade } from '../types';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface StatsGridProps {
  trades: Trade[];
}

export default function StatsGrid({ trades }: StatsGridProps) {
  const totalTrades = trades.length;
  const pendingCount = trades.filter((t) => t.status === 'Pending Reconciliation').length;
  const executedCount = trades.filter((t) => t.status === 'Successfully Executed').length;
  const errorCount = trades.filter((t) => t.status === 'Critical Error: Phantom Token').length;

  // Calculable SLA Performance
  const completedReconciles = trades.filter(
    (t) => t.status === 'Successfully Executed' && t.sla_status
  );
  const onTimeCount = completedReconciles.filter((t) => t.sla_status === 'On Time').length;
  const slaPercentage =
    completedReconciles.length > 0
      ? Math.round((onTimeCount / completedReconciles.length) * 100)
      : 100;

  // Total volume in reconstructed NGN equi
  const totalNgnVolume = trades
    .filter((t) => t.status === 'Successfully Executed' && t.ngn_equi)
    .reduce((sum, t) => sum + (t.ngn_equi || 0), 0);

  const formatNgnValue = (val: number) => {
    if (val >= 1_000_000_000) return `₦${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(2)}M`;
    return `₦${val.toLocaleString()}`;
  };

  return (
    <div id="stats-dashboard-grid" className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      {/* Stat 1: Total Trades */}
      <div
        id="stat-card-total"
        className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest">TOTAL TOKEN STAMPS</span>
          <FileText className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-zinc-900 font-mono">{totalTrades}</span>
          <div className="text-xs text-zinc-500 mt-1">Audit trail entries</div>
        </div>
      </div>

      {/* Stat 2: Pending Reconciliation */}
      <div
        id="stat-card-pending"
        className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest">PENDING ACTION</span>
          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-amber-600 font-mono">{pendingCount}</span>
          <div className="text-xs text-zinc-500 mt-1">Awaiting bank slips</div>
        </div>
      </div>

      {/* Stat 3: Successfully Executed */}
      <div
        id="stat-card-executed"
        className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest">RECONCILED TRADES</span>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-emerald-600 font-mono">{executedCount}</span>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1 font-mono">
            <span className="text-emerald-600 font-bold">{(executedCount / (totalTrades || 1) * 100).toFixed(0)}%</span>
            of total
          </div>
        </div>
      </div>

      {/* Stat 4: SLA On-Time % */}
      <div
        id="stat-card-sla"
        className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest">SLA ON-TIME</span>
          <Percent className="w-4 h-4 text-purple-500" />
        </div>
        <div className="mt-2">
          <span
            className={`text-2xl font-black font-mono ${
              slaPercentage >= 90
                ? 'text-emerald-600'
                : slaPercentage >= 80
                ? 'text-yellow-650'
                : 'text-rose-600'
            }`}
          >
            {slaPercentage}%
          </span>
          <div className="text-xs text-zinc-500 mt-1">
            {onTimeCount} of {completedReconciles.length} on time
          </div>
        </div>
      </div>

      {/* Stat 5: Reconciled Volume */}
      <div
        id="stat-card-volume"
        className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between col-span-2 lg:col-span-2 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest font-mono">RECONCILED VOLUME (NGN)</span>
          <TrendingUp className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-zinc-900 font-mono">
            {formatNgnValue(totalNgnVolume)}
          </span>
          <div className="text-xs text-zinc-500 mt-1 font-mono">
            From {executedCount} completed trades
          </div>
        </div>
      </div>
    </div>
  );
}
