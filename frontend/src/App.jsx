import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Database,
  Layers,
  Zap,
  Radio,
  Cpu,
  Compass,
} from 'lucide-react';

import AnomalyAlerts from './components/AnomalyAlerts';
import ChartOverview from './components/ChartOverview';
import LiveTail from './components/LiveTail';
import LogExplorer from './components/LogExplorer';

export default function App() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('15m');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'livetail' | 'explorer'
  const [selectedFilter, setSelectedFilter] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch(`/api/v1/analytics/overview?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Error fetching analytics overview:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const handleSelectFilter = (filter) => {
    setSelectedFilter(filter);
    setActiveTab('explorer');
  };

  const status = analyticsData?.system_status || 'HEALTHY';
  const totalLogs = analyticsData?.total_logs || 0;
  const activeHostsCount = analyticsData?.active_hosts_count || 0;
  const errorRate = analyticsData?.error_rate_percent || 0.0;

  return (
    <div className="min-h-screen bg-slate-100 bg-grid-pattern text-slate-900 flex flex-col selection:bg-cyan-500 selection:text-white font-sans">
      {/* Telemetry Command Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-50 border border-cyan-300 flex items-center justify-center text-cyan-600 cyber-border-cyan">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-mono font-extrabold text-slate-900 tracking-wider uppercase">
                  PULSE // COMMAND CENTER
                </h1>
              </div>
              <p className="text-[10px] font-mono text-slate-500">ClickHouse Engine • Micro-Batch Ingestion Pipeline</p>
            </div>
          </div>

          {/* Center Mode Controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs shadow-inner">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-cyan-700 border border-slate-300 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              COMMAND MATRIX
            </button>
            <button
              onClick={() => setActiveTab('livetail')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'livetail'
                  ? 'bg-white text-cyan-700 border border-slate-300 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              TELEMETRY STREAM
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'explorer'
                  ? 'bg-white text-cyan-700 border border-slate-300 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              DATA WAREHOUSE
            </button>
          </div>

          {/* Range & Refresh controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
            >
              <option value="15m">INTERVAL: 15M</option>
              <option value="1h">INTERVAL: 1H</option>
              <option value="6h">INTERVAL: 6H</option>
              <option value="24h">INTERVAL: 24H</option>
            </select>

            <button
              onClick={fetchAnalytics}
              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 shadow-sm transition-colors"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Metric Cards Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Total Ingested Logs */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">INGESTION VOLUME</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalLogs.toLocaleString()}</div>
              <span className="text-[10px] text-cyan-700 font-bold flex items-center gap-1 mt-1">
                <Zap className="w-3 h-3 text-cyan-600" /> MICRO-BATCH ACTIVE
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Active Nodes Count */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ACTIVE NODE CLUSTER</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeHostsCount} / {activeHostsCount} HOSTS</div>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                web, auth, db nodes
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Server className="w-5 h-5" />
            </div>
          </div>

          {/* Error Rate (%) */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ERROR FAILURE RATE</span>
              <div className={`text-2xl font-black mt-1 ${errorRate > 5 ? 'text-rose-600' : errorRate > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {errorRate}%
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">THRESHOLD EVALUATED</span>
            </div>
            <div className={`p-2.5 rounded-lg border ${errorRate > 5 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          {/* System Status Banner */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SYSTEM STATUS HUD</span>
              <div className="mt-1">
                {status === 'CRITICAL' ? (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 cyber-border-rose">
                    CRITICAL
                  </span>
                ) : status === 'DEGRADED' ? (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 cyber-border-amber">
                    DEGRADED
                  </span>
                ) : (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 cyber-border-emerald">
                    NOMINAL
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">REALTIME BASELINE ENGINE</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Mobile Tab Control */}
        <div className="flex md:hidden items-center justify-center gap-1 bg-slate-200 p-1.5 rounded-lg border border-slate-300 font-mono text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded ${activeTab === 'dashboard' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600'}`}
          >
            MATRIX
          </button>
          <button
            onClick={() => setActiveTab('livetail')}
            className={`px-3 py-1.5 rounded ${activeTab === 'livetail' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600'}`}
          >
            STREAM
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-1.5 rounded ${activeTab === 'explorer' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600'}`}
          >
            CLICKHOUSE
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <>
            <AnomalyAlerts analyticsData={analyticsData} onSelectFilter={handleSelectFilter} />
            <ChartOverview analyticsData={analyticsData} />
          </>
        )}

        {activeTab === 'livetail' && <LiveTail />}

        {activeTab === 'explorer' && <LogExplorer initialFilter={selectedFilter} />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs font-mono text-slate-500">
        <p>PULSE LOG ANALYZER • Fast-Path ClickHouse Columnar Database Telemetry Platform</p>
      </footer>
    </div>
  );
}
