import React, { useState } from 'react';
import { ClusterItem } from '../types';
import { Network, ChevronRight, Cpu } from 'lucide-react';

interface ClusterViewProps {
  clusters: ClusterItem[];
}

export const ClusterView: React.FC<ClusterViewProps> = ({ clusters }) => {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Semantic Error Root-Cause Clusters (<code className="lowercase font-mono">all-MiniLM-L6-v2</code>)
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {clusters.length} active root-cause groups
        </span>
      </div>

      {clusters.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded">
          No operational error clusters detected in current telemetry stream.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((cluster) => {
            const isSelected = selectedCluster === cluster.cluster_tag;
            const anomalyPercent = Math.round(cluster.anomaly_rate * 100);
            const isSevere = cluster.severity === 'ERROR' || cluster.severity === 'CRITICAL' || anomalyPercent > 50;

            return (
              <div
                key={cluster.cluster_tag}
                onClick={() => setSelectedCluster(isSelected ? null : cluster.cluster_tag)}
                className={`cursor-pointer bg-slate-950/60 rounded-lg border p-3.5 transition-all ${
                  isSelected
                    ? 'border-brand-500 ring-1 ring-brand-500/50 bg-slate-950'
                    : isSevere
                    ? 'border-rose-900/50 hover:border-rose-700/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Network className={`w-4 h-4 ${isSevere ? 'text-rose-400' : 'text-brand-400'}`} />
                    <h3 className="text-xs font-semibold text-white tracking-tight">
                      {cluster.cluster_tag}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                      isSevere ? 'bg-rose-950 text-rose-300 border border-rose-800/80' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {cluster.count} incidents
                  </span>
                </div>

                <div className="mt-2.5 flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Services:</span>
                  <div className="flex flex-wrap gap-1">
                    {cluster.services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Anomaly Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>AI Anomaly Confidence</span>
                    <span className={anomalyPercent > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {anomalyPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        anomalyPercent > 50 ? 'bg-rose-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.max(anomalyPercent, 5)}%` }}
                    />
                  </div>
                </div>

                {/* Expandable Sample Message */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  <div className="text-[11px] font-mono text-slate-400 truncate flex items-center justify-between">
                    <span className="truncate italic">&quot;{cluster.sample_message}&quot;</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                        isSelected ? 'rotate-90 text-brand-400' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 text-[11px] font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 whitespace-normal break-words">
                    <p className="font-semibold text-slate-400 mb-1">Latest Sample Trace:</p>
                    <p className="text-slate-200">{cluster.sample_message}</p>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      Severity: <span className="text-slate-300">{cluster.severity}</span> | Latest:{' '}
                      <span className="text-slate-300">{cluster.latest_timestamp}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
