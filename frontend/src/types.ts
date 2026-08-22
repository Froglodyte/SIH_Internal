export interface LogItem {
  id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
  host_ip: string;
  status_code: number;
  latency_ms: number;
  anomaly_score: number;
  is_anomaly: number;
  cluster_tag: string;
}

export interface Metrics {
  total_logs: number;
  error_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  active_anomalies: number;
}

export interface TimeseriesPoint {
  timestamp: string;
  total_count: number;
  normal_count: number;
  anomaly_count: number;
  avg_latency_ms: number;
}

export interface ClusterItem {
  cluster_tag: string;
  count: number;
  latest_timestamp: string;
  severity: string;
  sample_message: string;
  services: string[];
  anomaly_rate: number;
}

export type ScenarioType = 'ddos_attack' | 'db_pool_exhaustion' | 'auth_bruteforce';
