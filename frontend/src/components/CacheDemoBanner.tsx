import React from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Clock, Cpu, RefreshCw } from 'lucide-react';

interface CacheDemoBannerProps {
  lastCacheHit: boolean | null;
  lastLatencyMs: number | null;
  cachedAt: string | null;
  itemCount: number;
  onRunCacheDemo: () => void;
  isRunningDemo: boolean;
}

export const CacheDemoBanner: React.FC<CacheDemoBannerProps> = ({
  lastCacheHit,
  lastLatencyMs,
  cachedAt,
  itemCount,
  onRunCacheDemo,
  isRunningDemo,
}) => {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            Cache-Aside Pattern in Action
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Observe Real-Time Redis Performance
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Requests query Redis first. On a <span className="text-amber-400 font-semibold">Cache Miss</span>, data is queried from PostgreSQL and stored in Redis with a TTL. On a subsequent read, Redis returns the data instantly as a <span className="text-emerald-400 font-semibold">Cache Hit</span>. Any create, update, or delete automatically invalidates the cache.
          </p>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs font-bold text-slate-400">1. Initial Request</span>
              <p className="text-xs text-amber-300/90 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Cache Miss &rarr; DB Query
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs font-bold text-slate-400">2. Repeated Read</span>
              <p className="text-xs text-emerald-300/90 mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cache Hit &rarr; RAM Fast
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs font-bold text-slate-400">3. On Mutate</span>
              <p className="text-xs text-rose-300/90 mt-1 font-medium flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" /> Cache Invalidation
              </p>
            </div>
          </div>
        </div>

        {/* Live Result Meter */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-4 min-w-[280px]">
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Last Response Status
            </span>

            <div className="my-3 flex items-center justify-between">
              {lastCacheHit === null ? (
                <span className="text-sm text-slate-400">No request made yet</span>
              ) : lastCacheHit ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-lg font-bold text-emerald-400">⚡ CACHE HIT</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </span>
                  <span className="text-lg font-bold text-amber-400">🐢 CACHE MISS</span>
                </div>
              )}

              {lastLatencyMs !== null && (
                <div className="flex items-center gap-1 text-xs text-slate-300 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{lastLatencyMs} ms</span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-semibold text-slate-200">{itemCount}</span>
              </div>
              {cachedAt && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Cached at:</span>
                  <span className="font-mono text-slate-300">{new Date(cachedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onRunCacheDemo}
            disabled={isRunningDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-medium text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningDemo ? 'animate-spin' : ''}`} />
            {isRunningDemo ? 'Running Benchmark...' : 'Run Cache-Miss vs Cache-Hit Test'}
          </button>
        </div>
      </div>
    </div>
  );
};
