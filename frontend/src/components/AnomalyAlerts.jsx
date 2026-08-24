import React from 'react';
import { Activity, ShieldAlert, Cpu, Sparkles, ArrowUpRight } from 'lucide-react';

export default function AnomalyAlerts({ analyticsData, onSelectFilter, openAiDrawer }) {
  if (!analyticsData || !analyticsData.anomalies) return null;

  const anomalies = analyticsData.anomalies;
  const failingServices = analyticsData.top_failing_services || [];

  return (
    <div className="tactical-panel rounded-xl p-5 mb-6 border border-rose-200 bg-rose-50/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <span className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded-full border border-rose-200 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          CRITICAL ANOMALY DETECTED
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-white border border-slate-200 text-cyan-600 shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            THREAT & ANOMALY EVALUATION ENGINE
            <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
              Rule ID: CH-ANOMALY-v2
            </span>
          </h2>
          <p className="text-xs text-slate-500">Micro-batch baseline evaluation over 10-second intervals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        
        {/* General Anomalies (The Red Boxes) */}
        {anomalies.map((anomaly, idx) => (
          <div key={`anom-${idx}`} className="relative p-4 rounded-lg bg-rose-50 border border-rose-200 shadow-sm hover:border-rose-300 transition-colors group">
            
            {/* Top Right Action Buttons (AI & Isolate Arrow) */}
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openAiDrawer(`General System Anomaly Detected: ${anomaly}`)}
                className="p-1.5 rounded-md text-cyan-600 hover:bg-rose-100 transition-colors"
                title="Analyze with AI"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectFilter({ level: 'ERROR' })}
                className="p-1.5 rounded-md text-rose-500 hover:bg-rose-100 transition-colors"
                title="Inspect in Data Warehouse"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-rose-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="pr-16">
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 mb-2 inline-block">
                  CRITICAL ANOMALY
                </span>
                <p className="text-sm text-slate-800">{anomaly}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Service Failures (The Yellow Boxes) */}
        {failingServices.map((service, idx) => (
          <div key={`srv-${idx}`} className="relative flex items-center justify-between p-4 rounded-lg bg-[#fffcf0] border border-amber-200 shadow-sm hover:border-amber-300 transition-colors group">
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-500">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="pr-16">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-sm text-slate-800">{service.service}</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                    {service.error_count} FAILURES
                  </span>
                </div>
                <p className="text-xs text-slate-500">Service exceeding failure baseline threshold</p>
              </div>
            </div>
            
            {/* Action Buttons - Text removed, just arrows and sparkles */}
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openAiDrawer(`Service ${service.service} is failing. It logged ${service.error_count} critical errors in the last interval.`)}
                className="p-1.5 rounded-md text-cyan-600 hover:bg-amber-100 transition-colors"
                title="Analyze with AI"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectFilter({ service: service.service, level: 'ERROR' })}
                className="p-1.5 rounded-md text-amber-600 hover:bg-amber-100 transition-colors"
                title="Inspect in Data Warehouse"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}