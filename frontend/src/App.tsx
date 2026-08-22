import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { AnomalyChart } from './components/AnomalyChart';
import { ClusterView } from './components/ClusterView';
import { LogTable } from './components/LogTable';
import { Metrics, TimeseriesPoint, ClusterItem, LogItem } from './types';
import { fetchMetrics, fetchTimeseries, fetchClusters, fetchLogs } from './api';
import { LayoutDashboard, Terminal, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);

  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [anomaliesOnly, setAnomaliesOnly] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'clusters'>('overview');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [mRes, tRes, cRes, lRes] = await Promise.all([
        fetchMetrics().catch(() => null),
        fetchTimeseries().catch(() => []),
        fetchClusters().catch(() => []),
        fetchLogs({
          service: selectedService,
          level: selectedLevel,
          is_anomaly: anomaliesOnly ? true : undefined,
          limit: 100,
          offset: 0,
        }).catch(() => ({ logs: [], total: 0, limit: 100, offset: 0 })),
      ]);

      if (mRes) setMetrics(mRes);
      setTimeseries(tRes);
      setClusters(cRes);
      setLogs(lRes.logs);
      setTotalLogsCount(lRes.total);
    } catch (e) {
      console.error('Error updating dashboard data:', e);
    }
  }, [selectedService, selectedLevel, anomaliesOnly]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!isAutoRefreshing) return;
    const interval = setInterval(() => {
      loadDashboardData();
    }, 2000);
    return () => clearInterval(interval);
  }, [isAutoRefreshing, loadDashboardData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        onRefresh={loadDashboardData}
        isAutoRefreshing={isAutoRefreshing}
        setIsAutoRefreshing={setIsAutoRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-2 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-brand-500" />
            <span>Telemetry Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Tailing Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('clusters')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'clusters'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Semantic Clusters</span>
          </button>
        </div>

        {/* Dashboard Views */}
        {activeTab === 'overview' && (
          <>
            <MetricCards metrics={metrics} />
            <AnomalyChart data={timeseries} />
            <ClusterView clusters={clusters} />
            <LogTable
              logs={logs}
              total={totalLogsCount}
              selectedService={selectedService}
              setSelectedService={setSelectedService}
              selectedLevel={selectedLevel}
              setSelectedLevel={setSelectedLevel}
              anomaliesOnly={anomaliesOnly}
              setAnomaliesOnly={setAnomaliesOnly}
            />
          </>
        )}

        {activeTab === 'logs' && (
          <LogTable
            logs={logs}
            total={totalLogsCount}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            anomaliesOnly={anomaliesOnly}
            setAnomaliesOnly={setAnomaliesOnly}
          />
        )}

        {activeTab === 'clusters' && (
          <ClusterView clusters={clusters} />
        )}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-mono">
        SentinelLog Telemetry Platform &bull; ClickHouse Columnar Engine &bull; Inline AI Anomaly Triage
      </footer>
    </div>
  );
};
