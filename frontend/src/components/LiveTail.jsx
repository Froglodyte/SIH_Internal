import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2, Terminal, Filter, Search, ChevronDown, ChevronRight, Radio, Shield, Hash } from 'lucide-react';

const LEVEL_CHIPS = {
  INFO: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  WARN: 'bg-amber-100 text-amber-800 border-amber-300',
  ERROR: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
  CRITICAL: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold animate-pulse-fast',
};

export default function LiveTail() {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const terminalContainerRef = useRef(null);
  const eventSourceRef = useRef(null);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    // SSE Stream initialization
    const sseUrl = '/api/v1/logs/live-tail';
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
    };

    const handleNewLog = (event) => {
      if (isPausedRef.current) return;
      try {
        const parsedLog = JSON.parse(event.data);
        if (event.type === 'ai_anomaly') {
            parsedLog.is_ai_anomaly = true;
        }
        setLogs((prev) => {
          const next = [...prev, parsedLog];
          return next.slice(-250);
        });
      } catch (err) {
        console.error("Failed to parse SSE log:", err);
      }
    };

    es.onmessage = handleNewLog;
    es.addEventListener('ai_anomaly', handleNewLog);

    es.onerror = () => {
      setConnectionStatus('reconnecting');
    };

    return () => {
      es.close();
    };
  }, []);

  // Internal auto-scroll ONLY inside terminalContainerRef
  useEffect(() => {
    if (!isPaused && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === 'ALL' || log.level?.toUpperCase() === selectedLevel;
    const matchesSearch =
      !searchTerm ||
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.metadata?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="tactical-panel rounded-xl p-5 mb-6">
      {/* Console Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                SSE Telemetry Stream Console
              </h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 border border-slate-200">
                <Radio className={`w-3 h-3 ${connectionStatus === 'connected' ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
                <span className="text-slate-700 capitalize font-medium">{connectionStatus}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">Server-Sent Events broadcast ring buffer (last 250 items)</p>
          </div>
        </div>

        {/* Stream Actions */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isPaused
                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'RESUME STREAM' : 'PAUSE LOCK'}
          </button>

          <button
            onClick={() => setLogs([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            CLEAR
          </button>
        </div>
      </div>

      {/* Console Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 font-mono">
        <div className="relative w-full sm:w-44">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-white border border-slate-300 text-xs text-slate-800 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
          >
            <option value="ALL">ALL LEVELS</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search live stream by keyword, host, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 text-xs text-slate-800 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
          />
        </div>

        <div className="text-[11px] text-slate-500 self-end sm:self-center">
          LOGS: <strong className="text-slate-800 font-bold">{filteredLogs.length}</strong> / {logs.length}
        </div>
      </div>

      {/* Terminal Viewport Container */}
      <div
        ref={terminalContainerRef}
        className="bg-white border border-slate-200 rounded-lg p-3.5 h-96 overflow-y-auto mono-font text-xs space-y-1 shadow-inner"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <Terminal className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs">Waiting for live SSE logs... execute <span className="text-cyan-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">python scripts/simulate_nodes.py</span></p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isExpanded = expandedIndex === index;
            const chipClass = log.is_ai_anomaly ? 'bg-rose-200 text-rose-900 border-rose-400 font-bold animate-pulse' : (LEVEL_CHIPS[log.level] || 'bg-slate-100 text-slate-800 border-slate-300');
            const rowBgClass = log.is_ai_anomaly ? 'bg-rose-50 border-rose-200' : 'border-slate-100 hover:bg-slate-50';

            return (
              <div
                key={index}
                className={`group border-b p-1.5 rounded transition-colors ${rowBgClass}`}
              >
                <div className="flex flex-wrap items-center gap-2 cursor-pointer" onClick={() => setExpandedIndex(isExpanded ? null : index)}>
                  <span className="text-slate-400 text-[10px] w-6 flex-shrink-0 font-mono">#{index + 1}</span>

                  <button className="text-slate-400 hover:text-slate-700">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-slate-500 text-[10px]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }) : ''}
                  </span>

                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${chipClass}`}>
                    {log.level}
                  </span>

                  <span className="text-cyan-700 font-bold">[{log.host}]</span>
                  <span className="text-indigo-600 font-semibold">{log.service}</span>

                  <span className="text-slate-800 flex-1 truncate">{log.message}</span>
                </div>

                {isExpanded && (
                  <div className="mt-2 ml-8 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Payload Details:</p>
                    <pre className="text-[11px] text-cyan-300 whitespace-pre-wrap overflow-x-auto bg-slate-950 p-2.5 rounded-lg border border-slate-900 shadow-inner font-mono">
                      {typeof log.metadata === 'string'
                        ? log.metadata
                        : JSON.stringify(log.metadata, null, 2)}
                    </pre>
                    <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
                      <span>Source IP: <strong className="text-slate-900">{log.ip}</strong></span>
                      <span>ISO Timestamp: <strong className="text-slate-900">{log.timestamp}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
