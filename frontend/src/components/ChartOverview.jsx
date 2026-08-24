import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, Server, AlertCircle, PieChart as PieIcon, Layers, Radio } from 'lucide-react';

const LEVEL_HEX = {
  INFO: '#0284c7',      // Sky Blue
  WARN: '#d97706',      // Amber
  ERROR: '#e11d48',     // Rose Red
  CRITICAL: '#7e22ce',  // Purple
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedTime = label ? new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : label;
    return (
      <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md text-slate-800">
        <p className="font-semibold text-slate-700 mb-1 border-b border-slate-200 pb-1 flex items-center justify-between gap-4">
          <span>TIME: {formattedTime}</span>
          <span className="text-cyan-600 text-[10px] font-bold">10s BUCKET</span>
        </p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-6 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartOverview({ analyticsData }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const timeSeries = analyticsData?.time_series || [];
  const levelCounts = analyticsData?.level_counts || { INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 };
  const failingServices = analyticsData?.top_failing_services || [];
  const activeHosts = analyticsData?.top_active_hosts || [];

  const totalPieValues = Object.values(levelCounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const pieData = Object.entries(levelCounts)
    .map(([name, value]) => ({
      name,
      value: Number(value) || 0,
      color: LEVEL_HEX[name] || '#94a3b8',
    }))
    .filter((d) => d.value > 0);

  const formattedTimeSeries = timeSeries.map((item) => ({
    ...item,
    formattedTime: item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '',
  }));

  return (
    <div className="space-y-6 mb-6">
      <div className="tactical-panel rounded-xl p-5">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                  Telemetry & Ingestion Performance Radar
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  LIVE FEED
                </span>
              </div>
              <p className="text-xs text-slate-500">Continuous ClickHouse 10s interval aggregation</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-cyan-800 border border-slate-300 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TRAFFIC TELEMETRY
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'breakdown'
                  ? 'bg-white text-cyan-800 border border-slate-300 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DISTRIBUTION RADAR
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="h-72 w-full">
            {formattedTimeSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">
                [NO DATA IN RANGE] Run simulator to project telemetry streams into ClickHouse.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedTimeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyberTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="cyberErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" />
                  <XAxis dataKey="formattedTime" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Log Volume"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cyberTotal)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    name="Error/Critical Spikes"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#cyberErrors)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-72">
            {/* Level Pie */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-cyan-600" /> LOG LEVEL MATRIX
              </span>
              <div className="h-44 w-full">
                {totalPieValues === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Zero log levels in window
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-600 font-medium">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Failing Services */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col">
              <span className="text-xs font-mono font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> FAILING SERVICE RANKS
              </span>
              <div className="flex-1 w-full">
                {failingServices.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Zero failing services
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={failingServices} margin={{ left: -10, right: 10 }}>
                      <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                      <YAxis dataKey="service" type="category" stroke="#475569" fontSize={10} width={85} fontFamily="JetBrains Mono" />
                      <Tooltip />
                      <Bar dataKey="error_count" name="Errors" fill="#e11d48" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Active hosts */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col">
              <span className="text-xs font-mono font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-600" /> HOST NODE ACTIVITY RADAR
              </span>
              <div className="flex-1 w-full">
                {activeHosts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    No active hosts reporting
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={activeHosts} margin={{ left: -10, right: 10 }}>
                      <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                      <YAxis dataKey="host" type="category" stroke="#475569" fontSize={10} width={85} fontFamily="JetBrains Mono" />
                      <Tooltip />
                      <Bar dataKey="count" name="Logs" fill="#0284c7" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
