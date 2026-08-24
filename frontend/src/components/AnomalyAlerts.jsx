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
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 cyber-border-rose">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">CRITICAL ANOMALY DETECTED</span>
          </div>
        );
      case 'DEGRADED':
        return (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 cyber-border-amber">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">DEGRADED PERFORMANCE</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 cyber-border-emerald">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">TELEMETRY NOMINAL</span>
          </div>
        );
    }
  };

  return (
    <div className="tactical-panel rounded-xl p-5 mb-6">
      {/* Header telemetry status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                Threat & Anomaly Evaluation Engine
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                Rule ID: CH-ANOMALY-v2
              </span>
            </div>
            <p className="text-xs text-slate-500">Micro-batch baseline evaluation over 10-second intervals</p>
          </div>
        </div>

        <div>{renderStatusIndicator()}</div>
      </div>

      {/* Main Alert Grid */}
      {anomalies.length === 0 && failingServices.length === 0 ? (
        <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-mono font-semibold text-emerald-900 uppercase tracking-wide">
                Zero Active Anomaly Triggers
              </p>
              <p className="text-xs text-slate-600">Log ingestion rates and server node status are within expected parameters.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
            <span>STATUS: 200 OK</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {anomalies.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 hover:border-rose-400 shadow-sm transition-all cursor-pointer group flex items-start justify-between"
              onClick={() => onSelectFilter && onSelectFilter({ level: 'ERROR' })}
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-rose-100 text-rose-600 mt-0.5">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 uppercase">
                      CRITICAL ANOMALY
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 group-hover:text-rose-700 transition-colors">
                    {item}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          ))}

          {failingServices.map((fs, idx) => (
            <div
              key={`fs-${idx}`}
              className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 shadow-sm transition-all cursor-pointer group flex items-center justify-between"
              onClick={() => onSelectFilter && onSelectFilter({ service: fs.service, level: 'ERROR' })}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-amber-100 text-amber-700">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold text-amber-900">{fs.service}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      {fs.error_count} FAILURES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Service exceeding failure baseline threshold</p>
                </div>
              </div>
              <button className="text-[11px] font-mono text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md border border-amber-300 transition-colors flex items-center gap-1">
                ISOLATE <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
