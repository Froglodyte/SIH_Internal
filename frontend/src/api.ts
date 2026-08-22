import { LogItem, Metrics, TimeseriesPoint, ClusterItem, ScenarioType } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchMetrics(): Promise<Metrics> {
  const res = await fetch(`${BASE_URL}/api/metrics`);
  if (!res.ok) throw new Error('Failed to fetch telemetry metrics');
  return res.json();
}

export async function fetchTimeseries(): Promise<TimeseriesPoint[]> {
  const res = await fetch(`${BASE_URL}/api/metrics/timeseries`);
  if (!res.ok) throw new Error('Failed to fetch timeseries telemetry');
  return res.json();
}

export async function fetchClusters(): Promise<ClusterItem[]> {
  const res = await fetch(`${BASE_URL}/api/clusters`);
  if (!res.ok) throw new Error('Failed to fetch semantic clusters');
  return res.json();
}

export async function fetchLogs(params: {
  service?: string;
  level?: string;
  is_anomaly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ logs: LogItem[]; total: number; limit: number; offset: number }> {
  const query = new URLSearchParams();
  if (params.service && params.service !== 'ALL') query.append('service', params.service);
  if (params.level && params.level !== 'ALL') query.append('level', params.level);
  if (params.is_anomaly !== undefined) query.append('is_anomaly', String(params.is_anomaly));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.offset !== undefined) query.append('offset', String(params.offset));

  const res = await fetch(`${BASE_URL}/api/logs?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function triggerScenario(scenario: ScenarioType): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/api/simulator/trigger?scenario=${scenario}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger simulator scenario');
  return res.json();
}
