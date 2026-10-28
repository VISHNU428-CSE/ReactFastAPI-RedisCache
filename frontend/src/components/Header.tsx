import React from 'react';
import type { HealthResponse } from '../types';
import { Database, Zap, RefreshCw, Trash2, Server } from 'lucide-react';

interface HeaderProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  onRefreshAll: () => void;
  onClearCache: () => void;
  isClearing: boolean;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  healthLoading,
  onRefreshAll,
  onClearCache,
  isClearing,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-2.5 rounded-xl shadow-lg shadow-rose-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                FastAPI + Redis Cache
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Cache-Aside
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-performance React UI with live latency and hit/miss indicators
            </p>
          </div>
        </div>

        {/* System Health Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* API Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">FastAPI:</span>
            {healthLoading ? (
              <span className="text-slate-500 animate-pulse">Checking...</span>
            ) : health?.status === 'ok' ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Online
              </span>
            ) : (
              <span className="text-rose-400 font-medium">Offline</span>
            )}
          </div>

          {/* Redis Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Redis:</span>
            {healthLoading ? (
              <span className="text-slate-500 animate-pulse">...</span>
            ) : health?.redis === 'connected' ? (
              <span className="text-emerald-400 font-medium">Connected</span>
            ) : (
              <span className="text-amber-400 font-medium">{health?.redis || 'Checking'}</span>
            )}
          </div>

          {/* PostgreSQL Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">PostgreSQL:</span>
            {healthLoading ? (
              <span className="text-slate-500 animate-pulse">...</span>
            ) : health?.database === 'connected' ? (
              <span className="text-emerald-400 font-medium">Connected</span>
            ) : (
              <span className="text-sky-400 font-medium">{health?.database || 'Ready'}</span>
            )}
          </div>

          {/* Action Buttons */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-all disabled:opacity-50"
            title="Reload items and verify cache status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={onClearCache}
            disabled={isClearing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all disabled:opacity-50"
            title="Flush Redis cache to demonstrate subsequent Cache Miss"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isClearing ? 'Clearing...' : 'Flush Cache'}
          </button>
        </div>
      </div>
    </header>
  );
};
