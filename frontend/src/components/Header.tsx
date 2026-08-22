import React, { useState } from 'react';
import { Activity, Database, ShieldAlert, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { ScenarioType } from '../types';
import { triggerScenario } from '../api';

interface HeaderProps {
  onRefresh: () => void;
  isAutoRefreshing: boolean;
  setIsAutoRefreshing: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isAutoRefreshing, setIsAutoRefreshing }) => {
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleTrigger = async (scenario: ScenarioType, label: string) => {
    setActiveTrigger(scenario);
    try {
      const res = await triggerScenario(scenario);
      setNotification(`Triggered Incident Simulation: ${label}`);
      onRefresh();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification(`Failed to trigger scenario: ${err}`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setActiveTrigger(null);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Status */}
          <div className="flex items-center space-x-4">
            <div className="bg-brand-600/20 p-2 rounded-lg border border-brand-500/30">
              <Activity className="h-6 w-6 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">SentinelLog</h1>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Centralized IT Log Analytics & AI Anomaly Triage</p>
            </div>

            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-800">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-slate-300">Live Ingestion Active</span>
            </div>
          </div>

          {/* Action & Simulation Bar */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors border ${
                isAutoRefreshing
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
              <span>{isAutoRefreshing ? 'Auto 2s' : 'Paused'}</span>
            </button>

            <div className="hidden lg:flex items-center space-x-2 border-l border-slate-800 pl-3">
              <span className="text-xs text-slate-400 font-medium">Inject Incident:</span>
              <button
                disabled={activeTrigger !== null}
                onClick={() => handleTrigger('db_pool_exhaustion', 'DB Pool Exhaustion')}
                className="text-xs bg-slate-800 hover:bg-rose-950/50 text-slate-200 hover:text-rose-300 hover:border-rose-800/80 px-2.5 py-1.5 rounded border border-slate-700 transition flex items-center space-x-1"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>DB Exhaustion</span>
              </button>

              <button
                disabled={activeTrigger !== null}
                onClick={() => handleTrigger('ddos_attack', 'DDoS Attack')}
                className="text-xs bg-slate-800 hover:bg-rose-950/50 text-slate-200 hover:text-rose-300 hover:border-rose-800/80 px-2.5 py-1.5 rounded border border-slate-700 transition flex items-center space-x-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>DDoS Attack</span>
              </button>

              <button
                disabled={activeTrigger !== null}
                onClick={() => handleTrigger('auth_bruteforce', 'Auth Bruteforce')}
                className="text-xs bg-slate-800 hover:bg-rose-950/50 text-slate-200 hover:text-rose-300 hover:border-rose-800/80 px-2.5 py-1.5 rounded border border-slate-700 transition flex items-center space-x-1"
              >
                <Lock className="w-3.5 h-3.5 text-brand-400" />
                <span>Auth Bruteforce</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="bg-rose-950/80 border-b border-rose-800/60 px-4 py-2 text-xs text-rose-200 flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{notification}</span>
        </div>
      )}
    </header>
  );
};
