import React, { useState, useEffect, useRef } from 'react';
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
  Compass,
  Sparkles,
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Wrench
} from 'lucide-react';

import AnomalyAlerts from './components/AnomalyAlerts';
import ChartOverview from './components/ChartOverview';
import LiveTail from './components/LiveTail';
import LogExplorer from './components/LogExplorer';

export default function App() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('15m');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedFilter, setSelectedFilter] = useState(null);

  // --- AI DRAWER & RESIZING STATE ---
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(450); // Default width in px
  const [isResizing, setIsResizing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Handle mouse resizing logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < window.innerWidth * 0.8) {
        setDrawerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiLoading]);

  const handleSelectFilter = (filter) => {
    setSelectedFilter(filter);
    setActiveTab('explorer');
  };

  const openAiDrawer = async (alertContext) => {
    setIsAiDrawerOpen(true);
    setIsAiLoading(true);
    setChatHistory([{ role: 'assistant', content: 'Analyzing system alerts and fetching context...' }]);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert: alertContext, history: [] }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'API error occurred');
      }
      
      setChatHistory([{ role: 'assistant', content: data.response }]);
    } catch (err) {
      setChatHistory([{ role: 'assistant', content: `⚠️ Synapse AI Error: ${err.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { role: 'user', content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'API error occurred');
      }

      setChatHistory([...newHistory, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: 'assistant', content: `⚠️ Synapse AI Error: ${err.message}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper function to clean markdown asterisks and format AI response cards cleanly
  const cleanMarkdown = (text) => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').replace(/__/g, '').replace(/\*/g, '');
  };

  const renderFormattedAiResponse = (content) => {
    if (!content.includes('[ INCIDENT SUMMARY ]') && !content.includes('[ PROBABLE ROOT CAUSE ]')) {
      return <p className="text-slate-800 text-xs whitespace-pre-wrap">{cleanMarkdown(content)}</p>;
    }

    const parts = content.split(/(\[ INCIDENT SUMMARY \]|\[ PROBABLE ROOT CAUSE \]|\[ REMEDIATION STEPS \])/g);
    
    return (
      <div className="space-y-3 text-xs">
        {parts.map((part, i) => {
          if (part.includes('INCIDENT SUMMARY')) {
            return (
              <div key={i} className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                <span className="font-bold text-rose-700 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> INCIDENT SUMMARY
                </span>
                <p className="text-slate-700 leading-relaxed">{cleanMarkdown(parts[i + 1])?.trim()}</p>
              </div>
            );
          }
          if (part.includes('PROBABLE ROOT CAUSE')) {
            return (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <span className="font-bold text-amber-700 flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5" /> PROBABLE ROOT CAUSE
                </span>
                <div className="text-slate-700 space-y-1 pl-2">
                  {parts[i + 1]?.split('\n').map((line, idx) => line.trim() && (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{cleanMarkdown(line).replace(/^[-*•]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (part.includes('REMEDIATION STEPS')) {
            return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                <span className="font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
                  <Wrench className="w-3.5 h-3.5" /> REMEDIATION STEPS
                </span>
                <div className="text-slate-700 space-y-1 pl-2 font-mono text-[11px]">
                  {parts[i + 1]?.split('\n').map((line, idx) => line.trim() && (
                    <div key={idx} className="bg-white/80 border border-emerald-100 rounded px-2 py-1 my-1 text-slate-800">
                      {cleanMarkdown(line).replace(/^[-*•\d.]+\s*/, '')}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const status = analyticsData?.system_status || 'HEALTHY';
  const totalLogs = analyticsData?.total_logs || 0;
  const activeHostsCount = analyticsData?.active_hosts_count || 0;
  const errorRate = analyticsData?.error_rate_percent || 0.0;

  return (
    <div className="min-h-screen bg-slate-100 bg-grid-pattern text-slate-900 flex flex-col selection:bg-cyan-500 selection:text-white font-sans relative overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-50 border border-cyan-300 flex items-center justify-center text-cyan-600 cyber-border-cyan">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-mono font-extrabold text-slate-900 tracking-wider uppercase">
                  SYNAPSE // INTELLIGENCE HUB
                </h1>
              </div>
              <p className="text-[10px] font-mono text-slate-500">ClickHouse Engine • Micro-Batch Ingestion Pipeline</p>
            </div>
          </div>

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
              INTELLIGENCE MATRIX
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
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

        {activeTab === 'dashboard' && (
          <>
            <AnomalyAlerts analyticsData={analyticsData} onSelectFilter={handleSelectFilter} openAiDrawer={openAiDrawer} />
            <ChartOverview analyticsData={analyticsData} />
          </>
        )}

        {activeTab === 'livetail' && <LiveTail />}

        {activeTab === 'explorer' && (
          <LogExplorer initialFilter={selectedFilter} /> 
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs font-mono text-slate-500">
        <p>SYNAPSE INTELLIGENCE • Fast-Path ClickHouse Columnar Database Telemetry Platform</p>
      </footer>

      {/* --- RESIZABLE AI SLIDE-OUT DRAWER --- */}
      <div
        style={{ width: `${drawerWidth}px` }}
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl border-l border-slate-200 z-50 transition-transform duration-75 flex flex-col ${
          isAiDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Resize Handle on the left edge */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-cyan-500 transition-colors z-10"
          title="Drag to resize drawer"
        />

        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-cyan-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-mono font-bold text-sm tracking-wide">SYNAPSE AI ENGINE</h3>
          </div>
          <button onClick={() => setIsAiDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-sm">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3 rounded-lg max-w-[95%] shadow-sm ${
                  msg.role === 'user' ? 'bg-cyan-600 text-white text-xs' : 'bg-white border border-slate-200 w-full'
                }`}
              >
                {msg.role === 'assistant' ? (
                  renderFormattedAiResponse(msg.content)
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isAiLoading && (
            <div className="flex items-start">
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-slate-500 shadow-sm flex items-center gap-2 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" /> Synapse AI is thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Ask a follow-up question..."
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={handleSendChat}
              disabled={isAiLoading || !chatInput.trim()}
              className="p-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}