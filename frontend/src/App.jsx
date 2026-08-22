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
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black font-sans">
      {/* Telemetry Command Header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 cyber-border-cyan">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-mono font-extrabold text-white tracking-wider uppercase">
                  PULSE // COMMAND CENTER
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  v2.4 TELEMETRY
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">ClickHouse Engine • Micro-Batch Ingestion Pipeline</p>
            </div>
          </div>

          {/* Center Mode Controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              COMMAND MATRIX
            </button>
            <button
              onClick={() => setActiveTab('livetail')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all ${
                activeTab === 'livetail'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              TELEMETRY STREAM
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all ${
                activeTab === 'explorer'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
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
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-cyan-500"
            >
              <option value="15m">INTERVAL: 15M</option>
              <option value="1h">INTERVAL: 1H</option>
              <option value="6h">INTERVAL: 6H</option>
              <option value="24h">INTERVAL: 24H</option>
            </select>

            <button
              onClick={fetchAnalytics}
              className="p-2 rounded bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
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
          <div className="tactical-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INGESTION VOLUME</span>
              <div className="text-2xl font-black text-white mt-1">{totalLogs.toLocaleString()}</div>
              <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1 mt-1">
                <Zap className="w-3 h-3 text-cyan-400" /> MICRO-BATCH ACTIVE
              </span>
            </div>
            <div className="p-2.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Active Nodes Count */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ACTIVE NODE CLUSTER</span>
              <div className="text-2xl font-black text-white mt-1">{activeHostsCount} / 3 HOSTS</div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                web, auth, db nodes
              </span>
            </div>
            <div className="p-2.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Server className="w-5 h-5" />
            </div>
          </div>

          {/* Error Rate (%) */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ERROR FAILURE RATE</span>
              <div className={`text-2xl font-black mt-1 ${errorRate > 5 ? 'text-rose-400' : errorRate > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {errorRate}%
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">THRESHOLD EVALUATED</span>
            </div>
            <div className={`p-2.5 rounded border ${errorRate > 5 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          {/* System Status Banner */}
          <div className="tactical-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SYSTEM STATUS HUD</span>
              <div className="mt-1">
                {status === 'CRITICAL' ? (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/50 cyber-border-rose">
                    CRITICAL
                  </span>
                ) : status === 'DEGRADED' ? (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/50 cyber-border-amber">
                    DEGRADED
                  </span>
                ) : (
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 cyber-border-emerald">
                    NOMINAL
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">REALTIME BASELINE ENGINE</span>
            </div>
            <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Mobile Tab Control */}
        <div className="flex md:hidden items-center justify-center gap-1 bg-slate-950 p-1.5 rounded border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded ${activeTab === 'dashboard' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
          >
            MATRIX
          </button>
          <button
            onClick={() => setActiveTab('livetail')}
            className={`px-3 py-1.5 rounded ${activeTab === 'livetail' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
          >
            STREAM
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-1.5 rounded ${activeTab === 'explorer' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
          >
            CLICKHOUSE
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <>
            <AnomalyAlerts analyticsData={analyticsData} onSelectFilter={handleSelectFilter} />
            <ChartOverview analyticsData={analyticsData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LiveTail />
              <LogExplorer initialFilter={selectedFilter} />
            </div>
          </>
        )}

        {activeTab === 'livetail' && <LiveTail />}

        {activeTab === 'explorer' && <LogExplorer initialFilter={selectedFilter} />}
      </main>

      <footer className="border-t border-slate-800/80 bg-[#030712] py-4 text-center text-xs font-mono text-slate-500">
        <p>PULSE LOG ANALYZER • Fast-Path ClickHouse Columnar Database Telemetry Platform</p>
      </footer>
    </div>
  );
}
