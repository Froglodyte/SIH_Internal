import React, { useState } from 'react';
import { LogItem } from '../types';
import { Search, AlertOctagon, Terminal, X, Copy, Check } from 'lucide-react';

interface LogTableProps {
  logs: LogItem[];
  total: number;
  selectedService: string;
  setSelectedService: (svc: string) => void;
  selectedLevel: string;
  setSelectedLevel: (lvl: string) => void;
  anomaliesOnly: boolean;
  setAnomaliesOnly: (val: boolean) => void;
}

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  total,
  selectedService,
  setSelectedService,
  selectedLevel,
  setSelectedLevel,
  anomaliesOnly,
  setAnomaliesOnly,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.message.toLowerCase().includes(term) ||
      log.service.toLowerCase().includes(term) ||
      log.host_ip.includes(term) ||
      log.cluster_tag.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
    } else if (code >= 300 && code < 400) {
      return 'bg-blue-950/80 text-blue-400 border-blue-800/60';
    } else if (code >= 400 && code < 500) {
      return 'bg-amber-950/80 text-amber-400 border-amber-800/60';
    } else {
      return 'bg-rose-950/80 text-rose-400 border-rose-800/60';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case 'INFO':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'WARN':
      case 'WARNING':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'ERROR':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'CRITICAL':
      case 'FATAL':
        return 'bg-rose-900 text-rose-100 font-bold border-rose-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Live Telemetry Log Feed
          </h2>
          <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            {total} total records
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          {/* Service Dropdown */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value="ALL">All Services</option>
            <option value="auth-service">auth-service</option>
            <option value="payment-gateway">payment-gateway</option>
            <option value="frontend-proxy">frontend-proxy</option>
            <option value="postgres-db">postgres-db</option>
          </select>

          {/* Severity Dropdown */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          {/* Anomalies Only Toggle */}
          <button
            onClick={() => setAnomaliesOnly(!anomaliesOnly)}
            className={`text-xs px-3 py-1.5 rounded flex items-center space-x-1.5 transition font-mono border ${
              anomaliesOnly
                ? 'bg-rose-950/80 text-rose-300 border-rose-800 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Anomalies Only</span>
          </button>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-md">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Service</th>
              <th className="py-2.5 px-3">Level</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Latency</th>
              <th className="py-2.5 px-3">AI Score</th>
              <th className="py-2.5 px-3">Cluster Tag</th>
              <th className="py-2.5 px-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                  No log records match the selected filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isAnomaly = log.is_anomaly === 1 || log.anomaly_score >= 0.75;
                const formattedTime = log.timestamp.length > 19 ? log.timestamp.substring(11, 23) : log.timestamp;

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer hover:bg-slate-800/60 transition ${
                      isAnomaly ? 'bg-rose-950/20 text-rose-200' : 'text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-200 font-semibold">
                      {log.service}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getLevelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getStatusBadge(log.status_code)}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                      {log.latency_ms.toFixed(1)} ms
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-bold ${isAnomaly ? 'text-rose-400' : 'text-slate-400'}`}>
                          {log.anomaly_score.toFixed(2)}
                        </span>
                        {isAnomaly && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-400 max-w-[140px] truncate">
                      {log.cluster_tag}
                    </td>
                    <td className="py-2 px-3 max-w-md truncate text-slate-300 text-[11px]">
                      {log.message}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out / Modal JSON Payload Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-white">Log Telemetry Record Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <p><span className="text-slate-500">ID:</span> {selectedLog.id}</p>
                <p><span className="text-slate-500">Timestamp:</span> {selectedLog.timestamp}</p>
                <p><span className="text-slate-500">Service:</span> {selectedLog.service}</p>
                <p><span className="text-slate-500">Host IP:</span> {selectedLog.host_ip}</p>
                <p><span className="text-slate-500">Level:</span> {selectedLog.level}</p>
                <p><span className="text-slate-500">Status Code:</span> {selectedLog.status_code}</p>
                <p><span className="text-slate-500">Latency:</span> {selectedLog.latency_ms} ms</p>
                <p><span className="text-slate-500">AI Anomaly Score:</span> {selectedLog.anomaly_score} (is_anomaly={selectedLog.is_anomaly})</p>
                <p><span className="text-slate-500">Cluster Tag:</span> {selectedLog.cluster_tag}</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1 font-sans text-xs">Raw Message:</p>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-rose-300 whitespace-pre-wrap break-words">
                  {selectedLog.message}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded flex items-center space-x-1 font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
