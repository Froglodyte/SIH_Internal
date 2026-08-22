import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { TimeseriesPoint } from '../types';
import { Activity } from 'lucide-react';

interface AnomalyChartProps {
  data: TimeseriesPoint[];
}

export const AnomalyChart: React.FC<AnomalyChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'volume' | 'latency'>('volume');

  const formattedData = data.map((item) => {
    let timeLabel = item.timestamp;
    try {
      const d = new Date(item.timestamp);
      timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      timeLabel = item.timestamp.substring(11, 16);
    }

    return {
      ...item,
      timeLabel,
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Real-Time Telemetry & Anomaly Traffic Volume
          </h2>
        </div>

        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-md border border-slate-700">
          <button
            onClick={() => setViewMode('volume')}
            className={`text-xs px-2.5 py-1 rounded transition ${
              viewMode === 'volume'
                ? 'bg-slate-700 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Volume & Anomalies
          </button>
          <button
            onClick={() => setViewMode('latency')}
            className={`text-xs px-2.5 py-1 rounded transition ${
              viewMode === 'latency'
                ? 'bg-slate-700 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Avg Latency (ms)
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            Awaiting log stream data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                fontFamily="JetBrains Mono"
              />
              <YAxis stroke="#6b7280" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#f3f4f6',
                  fontFamily: 'JetBrains Mono',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
              />

              {viewMode === 'volume' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="normal_count"
                    name="Normal Traffic"
                    fill="#3b82f6"
                    stroke="#2563eb"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Bar
                    dataKey="anomaly_count"
                    name="AI Anomaly Incidents"
                    fill="#f43f5e"
                    radius={[2, 2, 0, 0]}
                    barSize={12}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="avg_latency_ms"
                  name="Avg Latency (ms)"
                  fill="#8b5cf6"
                  stroke="#7c3aed"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
