import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Database, Eye, X, Copy, Check, Terminal, Code2 } from 'lucide-react';

const LEVEL_CHIPS = {
  INFO: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  WARN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  ERROR: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
  CRITICAL: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
};

export default function LogExplorer({ initialFilter }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(initialFilter?.level || 'ALL');
  const [service, setService] = useState(initialFilter?.service || '');
  const [host, setHost] = useState(initialFilter?.host || '');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialFilter?.level) setLevel(initialFilter.level);
    if (initialFilter?.service) setService(initialFilter.service);
    if (initialFilter?.host) setHost(initialFilter.host);
  }, [initialFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      if (level && level !== 'ALL') queryParams.append('level', level);
      if (service.trim()) queryParams.append('service', service.trim());
      if (host.trim()) queryParams.append('host', host.trim());
      if (search.trim()) queryParams.append('search', search.trim());

      const res = await fetch(`/api/v1/logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error querying ClickHouse:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [limit, level]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const copyMetadata = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tactical-panel rounded-xl p-5 mb-6">
      {/* Explorer Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
              ClickHouse Data Warehouse Query Studio
            </h2>
            <p className="text-xs text-slate-400">Indexed MergeTree engine execution</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          EXECUTE QUERY
        </button>
      </div>

      {/* Query Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4 font-mono">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">LEVEL</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL LEVELS</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">HOST NODE</label>
          <input
            type="text"
            placeholder="e.g. web-node-01"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">SERVICE</label>
          <input
            type="text"
            placeholder="e.g. auth-service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">KEYWORD SEARCH</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Regex search message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-2 rounded focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">LIMIT</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2 py-2 rounded focus:outline-none focus:border-cyan-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-colors uppercase"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Query Data Table */}
      <div className="overflow-x-auto overflow-y-auto h-96 rounded border border-slate-900 bg-slate-950">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900 z-10 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-2.5 font-bold">TIMESTAMP (UTC)</th>
              <th className="px-4 py-2.5 font-bold">LEVEL</th>
              <th className="px-4 py-2.5 font-bold">HOST</th>
              <th className="px-4 py-2.5 font-bold">SERVICE</th>
              <th className="px-4 py-2.5 font-bold">MESSAGE</th>
              <th className="px-4 py-2.5 font-bold text-right">PAYLOAD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 mono-font text-[11px]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 font-mono text-xs">
                  {loading ? "[EXECUTING SQL QUERY...]" : "[NO MATCHING RECORD SET]"}
                </td>
              </tr>
            ) : (
              logs.map((row, idx) => {
                const badgeClass = LEVEL_CHIPS[row.level] || 'bg-slate-800 text-slate-300 border-slate-700';
                return (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors group">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-400 text-[10px]">
                      {row.timestamp ? new Date(row.timestamp).toISOString().replace('T', ' ').substring(0, 23) : ''}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${badgeClass}`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-cyan-400 font-bold">{row.host}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-indigo-300">{row.service}</td>
                    <td className="px-4 py-2 max-w-md truncate text-slate-200">{row.message}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(row)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <Code2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* JSON Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
          <div className="bg-slate-950 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-bold rounded border ${LEVEL_CHIPS[selectedLog.level]}`}>
                  {selectedLog.level}
                </span>
                <h3 className="font-bold text-white text-sm">PAYLOAD INSPECTOR</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black p-2.5 rounded border border-slate-900">
                <span className="text-slate-500 block text-[9px]">HOST</span>
                <span className="text-cyan-400 font-bold">{selectedLog.host}</span>
              </div>
              <div className="bg-black p-2.5 rounded border border-slate-900">
                <span className="text-slate-500 block text-[9px]">SERVICE</span>
                <span className="text-indigo-300 font-bold">{selectedLog.service}</span>
              </div>
              <div className="bg-black p-2.5 rounded border border-slate-900">
                <span className="text-slate-500 block text-[9px]">SOURCE IP</span>
                <span className="text-slate-300">{selectedLog.ip}</span>
              </div>
              <div className="bg-black p-2.5 rounded border border-slate-900">
                <span className="text-slate-500 block text-[9px]">TIMESTAMP</span>
                <span className="text-slate-300">{selectedLog.timestamp}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-xs font-bold block mb-1">LOG MESSAGE</span>
              <div className="p-3 bg-black rounded border border-slate-900 text-xs text-slate-200">
                {selectedLog.message}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs font-bold">RAW JSON METADATA</span>
                <button
                  onClick={() => copyMetadata(typeof selectedLog.metadata === 'string' ? selectedLog.metadata : JSON.stringify(selectedLog.metadata, null, 2))}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'COPIED' : 'COPY JSON'}
                </button>
              </div>
              <pre className="p-3 bg-black rounded border border-slate-900 text-xs text-cyan-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {typeof selectedLog.metadata === 'string'
                  ? selectedLog.metadata
                  : JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded border border-slate-800"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
