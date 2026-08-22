import React from 'react';
import { Layers, AlertTriangle, Clock, Zap, ShieldAlert } from 'lucide-react';
import { Metrics } from '../types';

interface MetricCardsProps {
  metrics: Metrics | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const totalLogs = metrics ? metrics.total_logs.toLocaleString() : '0';
  const errorRatePercent = metrics ? (metrics.error_rate * 100).toFixed(1) : '0.0';
  const avgLatency = metrics ? metrics.avg_latency_ms.toFixed(1) : '0.0';
  const p95Latency = metrics ? metrics.p95_latency_ms.toFixed(1) : '0.0';
  const activeAnomalies = metrics ? metrics.active_anomalies : 0;

  const isHighError = metrics && metrics.error_rate > 0.05;
  const isHighAnomaly = activeAnomalies > 5;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Total Ingestion Volume */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Ingestion Volume</span>
          <div className="p-1.5 rounded bg-slate-800 text-slate-300">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono text-white">{totalLogs}</span>
          <span className="text-xs text-slate-500 ml-2">records / 60m</span>
        </div>
      </div>

      {/* Anomaly Incident Rate */}
      <div className={`bg-slate-900 border rounded-lg p-4 flex flex-col justify-between ${
        isHighError ? 'border-rose-900/60 bg-rose-950/10' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Error & Warning Rate</span>
          <div className={`p-1.5 rounded ${isHighError ? 'bg-rose-900/30 text-rose-400' : 'bg-slate-800 text-amber-400'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className={`text-2xl font-bold font-mono ${isHighError ? 'text-rose-400' : 'text-slate-100'}`}>
            {errorRatePercent}%
          </span>
          <span className="text-xs text-slate-500 ml-2">of total stream</span>
        </div>
      </div>

      {/* Avg Response Latency */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Average Latency</span>
          <div className="p-1.5 rounded bg-slate-800 text-brand-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono text-white">{avgLatency}</span>
          <span className="text-xs text-slate-500 ml-1">ms</span>
        </div>
      </div>

      {/* P95 Response Latency */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">P95 Tail Latency</span>
          <div className="p-1.5 rounded bg-slate-800 text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono text-white">{p95Latency}</span>
          <span className="text-xs text-slate-500 ml-1">ms</span>
        </div>
      </div>

      {/* Active AI Anomaly Flags */}
      <div className={`bg-slate-900 border rounded-lg p-4 flex flex-col justify-between ${
        isHighAnomaly ? 'border-rose-800 bg-rose-950/20' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Active AI Anomaly Flags</span>
          <div className={`p-1.5 rounded ${isHighAnomaly ? 'bg-rose-900/40 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className={`text-2xl font-bold font-mono ${isHighAnomaly ? 'text-rose-400' : 'text-white'}`}>
            {activeAnomalies}
          </span>
          <span className="text-xs font-mono text-slate-400">score &gt; 0.75</span>
        </div>
      </div>
    </div>
  );
};
