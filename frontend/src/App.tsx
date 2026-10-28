import { useState, useEffect, useCallback } from 'react';
import type { Item, HealthResponse } from './types';
import { getHealth, getItems, createItem, updateItem, deleteItem, clearCache } from './api';
import { Header } from './components/Header';
import { CacheDemoBanner } from './components/CacheDemoBanner';
import { ItemForm } from './components/ItemForm';
import { ItemList } from './components/ItemList';
import { Activity, AlertOctagon } from 'lucide-react';

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Cache response tracking
  const [lastCacheHit, setLastCacheHit] = useState<boolean | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  // System Health
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Action states
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    missLatency: number;
    hitLatency: number;
    speedup: string;
  } | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const res = await getHealth();
      setHealth(res);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getItems();
      setItems(res.items);
      setLastCacheHit(res.cache_hit);
      setLastLatencyMs(res.latency_ms);
      setCachedAt(res.cached_at);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadItems();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, [loadHealth, loadItems]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([loadHealth(), loadItems()]);
    setIsRefreshing(false);
  };

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      setMutationError(null);
      await clearCache();
      setBenchmarkResult(null);
      // After clearing cache, re-fetch items to show Cache Miss!
      await loadItems();
    } catch (err: any) {
      setMutationError(`Failed to clear cache: ${err.message || err}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCreateItem = async (newItem: { title: string; description: string; price?: number }) => {
    try {
      setIsCreating(true);
      setMutationError(null);
      await createItem(newItem);
      // Re-fetch items: cache was invalidated, will result in Cache Miss then populated
      await loadItems();
    } catch (err: any) {
      setMutationError(`Failed to create item: ${err.message || err}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateItem = async (id: number, updated: { title: string; description: string; price?: number }) => {
    try {
      setMutationError(null);
      await updateItem(id, updated);
      await loadItems();
    } catch (err: any) {
      setMutationError(`Failed to update item: ${err.message || err}`);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      setMutationError(null);
      await deleteItem(id);
      await loadItems();
    } catch (err: any) {
      setMutationError(`Failed to delete item: ${err.message || err}`);
    }
  };

  // Automated Cache Miss vs Cache Hit demonstration
  const handleRunCacheDemo = async () => {
    try {
      setIsRunningDemo(true);
      setBenchmarkResult(null);
      setMutationError(null);

      // Step 1: Invalidate Redis Cache
      await clearCache();

      // Step 2: 1st fetch -> CACHE MISS (from database)
      const missRes = await getItems();
      setItems(missRes.items);
      setLastCacheHit(missRes.cache_hit);
      setLastLatencyMs(missRes.latency_ms);
      setCachedAt(missRes.cached_at);

      // Small pause for realistic telemetry
      await new Promise((r) => setTimeout(r, 400));

      // Step 3: 2nd fetch -> CACHE HIT (from Redis memory)
      const hitRes = await getItems();
      setItems(hitRes.items);
      setLastCacheHit(hitRes.cache_hit);
      setLastLatencyMs(hitRes.latency_ms);
      setCachedAt(hitRes.cached_at);

      const miss = Math.max(missRes.latency_ms, 0.1);
      const hit = Math.max(hitRes.latency_ms, 0.1);
      const speedup = (miss / hit).toFixed(1);

      setBenchmarkResult({
        missLatency: missRes.latency_ms,
        hitLatency: hitRes.latency_ms,
        speedup: `${speedup}x`,
      });
    } catch (err: any) {
      setMutationError(`Benchmark failed: ${err.message || err}`);
    } finally {
      setIsRunningDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        health={health}
        healthLoading={healthLoading}
        onRefreshAll={handleRefreshAll}
        onClearCache={handleClearCache}
        isClearing={isClearing}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Mutation / Action Error Banner */}
        {mutationError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-300 text-xs sm:text-sm shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{mutationError}</span>
            </div>
            <button
              onClick={() => setMutationError(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Cache Demo & Performance Banner */}
        <CacheDemoBanner
          lastCacheHit={lastCacheHit}
          lastLatencyMs={lastLatencyMs}
          cachedAt={cachedAt}
          itemCount={items.length}
          onRunCacheDemo={handleRunCacheDemo}
          isRunningDemo={isRunningDemo}
        />

        {/* Benchmark Results Callout */}
        {benchmarkResult && (
          <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Automated Cache Benchmark Completed!
                </h4>
                <p className="text-xs text-slate-300">
                  1st Request (Cache Miss): <strong className="text-amber-400 font-mono">{benchmarkResult.missLatency} ms</strong> &bull; 
                  2nd Request (Cache Hit): <strong className="text-emerald-400 font-mono">{benchmarkResult.hitLatency} ms</strong>
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Performance Gain</span>
              <span className="text-lg font-black text-emerald-400">{benchmarkResult.speedup} faster</span>
            </div>
          </div>
        )}

        {/* Workspace Layout: Form on Left, Items on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 sticky top-24">
            <ItemForm onSubmit={handleCreateItem} isLoading={isCreating} />
          </div>

          <div className="lg:col-span-2">
            <ItemList
              items={items}
              isLoading={isLoading}
              error={error}
              onRetry={loadItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Built with React + Vite &bull; FastAPI Backend &bull; Redis Cache-Aside &bull; PostgreSQL &bull; Docker Compose</p>
      </footer>
    </div>
  );
}

export default App;
