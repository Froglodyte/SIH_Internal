import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Shield, ShieldCheck, Activity, Radio, Cpu, ArrowUpRight } from 'lucide-react';

export default function AnomalyAlerts({ analyticsData, onSelectFilter }) {
  const anomalies = analyticsData?.anomalies || [];
  const systemStatus = analyticsData?.system_status || 'HEALTHY';
  const failingServices = analyticsData?.top_failing_services || [];

  const renderStatusIndicator = () => {
    switch (systemStatus) {
      case 'CRITICAL':
        return (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/50 text-rose-400 cyber-border-rose">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">CRITICAL ANOMALY DETECTED</span>
          </div>
        );
      case 'DEGRADED':
        return (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/50 text-amber-400 cyber-border-amber">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">DEGRADED PERFORMANCE</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 cyber-border-emerald">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">TELEMETRY NOMINAL</span>
          </div>
        );
    }
  };

  return (
    <div className="tactical-panel rounded-xl p-5 mb-6">
      {/* Header telemetry status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
                Threat & Anomaly Evaluation Engine
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                Rule ID: CH-ANOMALY-v2
              </span>
            </div>
            <p className="text-xs text-slate-400">Micro-batch baseline evaluation over 10-second intervals</p>
          </div>
        </div>

        <div>{renderStatusIndicator()}</div>
      </div>

      {/* Main Alert Grid */}
      {anomalies.length === 0 && failingServices.length === 0 ? (
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wide">
                Zero Active Anomaly Triggers
              </p>
              <p className="text-xs text-slate-400">Log ingestion rates and server node status are within expected parameters.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>STATUS: 200 OK</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {anomalies.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/60 hover:border-rose-500/60 transition-all cursor-pointer group flex items-start justify-between"
              onClick={() => onSelectFilter && onSelectFilter({ level: 'ERROR' })}
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-rose-500/20 text-rose-400 mt-0.5">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 uppercase">
                      CRITICAL ANOMALY
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 group-hover:text-rose-300 transition-colors">
                    {item}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          ))}

          {failingServices.map((fs, idx) => (
            <div
              key={`fs-${idx}`}
              className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/60 hover:border-amber-500/60 transition-all cursor-pointer group flex items-center justify-between"
              onClick={() => onSelectFilter && onSelectFilter({ service: fs.service, level: 'ERROR' })}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-amber-500/20 text-amber-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold text-amber-200">{fs.service}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {fs.error_count} FAILURES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Service exceeding failure baseline threshold</p>
                </div>
              </div>
              <button className="text-[11px] font-mono text-amber-400 hover:text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 px-2.5 py-1 rounded border border-amber-800/80 transition-colors flex items-center gap-1">
                ISOLATE <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
