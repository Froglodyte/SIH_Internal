import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Database, Eye, X, Copy, Check, Terminal, Code2 } from 'lucide-react';

const LEVEL_CHIPS = {
  INFO: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  WARN: 'bg-amber-100 text-amber-800 border-amber-300',
  ERROR: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
  CRITICAL: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
              ClickHouse Data Warehouse Query Studio
            </h2>
            <p className="text-xs text-slate-500">Indexed MergeTree engine execution</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-sm disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          EXECUTE QUERY
        </button>
      </div>

      {/* Query Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4 font-mono">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">LEVEL</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full bg-white border border-slate-300 text-xs text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
          >
            <option value="ALL">ALL LEVELS</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">HOST NODE</label>
          <input
            type="text"
            placeholder="e.g. web-node-01"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="w-full bg-white border border-slate-300 text-xs text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">SERVICE</label>
          <input
            type="text"
            placeholder="e.g. auth-service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full bg-white border border-slate-300 text-xs text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">KEYWORD SEARCH</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Regex search message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 text-xs text-slate-800 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">LIMIT</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 text-xs text-slate-800 px-2 py-2 rounded-lg focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors uppercase shadow-sm"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Query Data Table */}
      <div className="overflow-x-auto overflow-y-auto h-96 rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="sticky top-0 bg-slate-100 z-10 text-slate-600 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 font-bold">TIMESTAMP (UTC)</th>
              <th className="px-4 py-2.5 font-bold">LEVEL</th>
              <th className="px-4 py-2.5 font-bold">HOST</th>
              <th className="px-4 py-2.5 font-bold">SERVICE</th>
              <th className="px-4 py-2.5 font-bold">MESSAGE</th>
              <th className="px-4 py-2.5 font-bold text-right">PAYLOAD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 mono-font text-[11px]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 font-mono text-xs">
                  {loading ? "[EXECUTING SQL QUERY...]" : "[NO MATCHING RECORD SET]"}
                </td>
              </tr>
            ) : (
              logs.map((row, idx) => {
                const badgeClass = LEVEL_CHIPS[row.level] || 'bg-slate-100 text-slate-700 border-slate-300';
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500 text-[10px]">
                      {row.timestamp ? new Date(row.timestamp).toISOString().replace('T', ' ').substring(0, 23) : ''}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${badgeClass}`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-cyan-700 font-bold">{row.host}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-indigo-600 font-semibold">{row.service}</td>
                    <td className="px-4 py-2 max-w-md truncate text-slate-800">{row.message}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(row)}
                        className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-mono">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-bold rounded border ${LEVEL_CHIPS[selectedLog.level]}`}>
                  {selectedLog.level}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">PAYLOAD INSPECTOR</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[9px] font-bold">HOST</span>
                <span className="text-cyan-700 font-bold">{selectedLog.host}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[9px] font-bold">SERVICE</span>
                <span className="text-indigo-600 font-bold">{selectedLog.service}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[9px] font-bold">SOURCE IP</span>
                <span className="text-slate-800 font-medium">{selectedLog.ip}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[9px] font-bold">TIMESTAMP</span>
                <span className="text-slate-800 font-medium">{selectedLog.timestamp}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-600 text-xs font-bold block mb-1">LOG MESSAGE</span>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-900">
                {selectedLog.message}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600 text-xs font-bold">RAW JSON METADATA</span>
                <button
                  onClick={() => copyMetadata(typeof selectedLog.metadata === 'string' ? selectedLog.metadata : JSON.stringify(selectedLog.metadata, null, 2))}
                  className="flex items-center gap-1 text-[10px] text-cyan-600 hover:text-cyan-800 font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'COPIED' : 'COPY JSON'}
                </button>
              </div>
              <pre className="p-3 bg-slate-950 rounded-lg border border-slate-900 text-xs text-cyan-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono shadow-inner">
                {typeof selectedLog.metadata === 'string'
                  ? selectedLog.metadata
                  : JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
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
