import React from 'react';
import type { Item } from '../types';
import { ItemCard } from './ItemCard';
import { PackageOpen, AlertOctagon, RefreshCw } from 'lucide-react';

interface ItemListProps {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdateItem: (id: number, item: { title: string; description: string; price?: number }) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  isLoading,
  error,
  onRetry,
  onUpdateItem,
  onDeleteItem,
}) => {
  if (isLoading && items.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 animate-pulse space-y-3">
            <div className="h-5 bg-slate-800 rounded-md w-3/4" />
            <div className="h-4 bg-slate-800/60 rounded-md w-full" />
            <div className="h-4 bg-slate-800/60 rounded-md w-1/2" />
            <div className="h-8 bg-slate-800/40 rounded-md w-full mt-4" />
          </div>
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-rose-900/40 p-8 text-center max-w-lg mx-auto shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">Connection / API Error</h3>
        <p className="text-xs text-rose-300 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-2 border border-slate-700 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <PackageOpen className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No Items in Database</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Create an item using the form above to populate PostgreSQL and inspect Redis cache behavior.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">
          Cached Items Collection ({items.length})
        </h3>
        {isLoading && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
            Updating cache data...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onUpdate={onUpdateItem}
            onDelete={onDeleteItem}
          />
        ))}
      </div>
    </div>
  );
};
