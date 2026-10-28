import React, { useState } from 'react';
import type { Item, SingleItemResponse } from '../types';
import { getItem } from '../api';
import { Trash2, Edit3, Check, X, Clock, Zap, RefreshCw, AlertCircle } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  onUpdate: (id: number, item: { title: string; description: string; price?: number }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? '');
  const [editPrice, setEditPrice] = useState(
    item.price !== undefined && item.price !== null ? item.price.toString() : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize edit inputs when item prop updates (e.g. after reload or cache refresh)
  React.useEffect(() => {
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
    setEditPrice(
      item.price !== undefined && item.price !== null ? item.price.toString() : ''
    );
  }, [item]);

  const handleOpenEdit = () => {
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
    setEditPrice(
      item.price !== undefined && item.price !== null ? item.price.toString() : ''
    );
    setIsEditing(true);
  };

  // Single-item cache test state
  const [singleCacheStatus, setSingleCacheStatus] = useState<SingleItemResponse | null>(null);
  const [isTestingSingle, setIsTestingSingle] = useState(false);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    try {
      setIsSaving(true);
      await onUpdate(item.id, {
        title: editTitle.trim(),
        description: (editDescription || '').trim(),
        price: editPrice.trim() !== '' ? parseFloat(editPrice) : undefined,
      });
      setIsEditing(false);
      setSingleCacheStatus(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete item "${item.title}"? This will invalidate Redis cache.`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestSingleItemCache = async () => {
    try {
      setIsTestingSingle(true);
      const res = await getItem(item.id);
      setSingleCacheStatus(res);
    } catch (err: any) {
      console.error('Error fetching single item:', err);
    } finally {
      setIsTestingSingle(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg transition-all hover:border-slate-700/80 group">
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label htmlFor={`edit-title-${item.id}`} className="text-[11px] font-semibold text-slate-400 block mb-1">Title</label>
            <input
              id={`edit-title-${item.id}`}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label htmlFor={`edit-desc-${item.id}`} className="text-[11px] font-semibold text-slate-400 block mb-1">Description</label>
            <textarea
              id={`edit-desc-${item.id}`}
              value={editDescription ?? ''}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-rose-500 resize-none"
            />
          </div>
          <div>
            <label htmlFor={`edit-price-${item.id}`} className="text-[11px] font-semibold text-slate-400 block mb-1">Price ($)</label>
            <input
              id={`edit-price-${item.id}`}
              type="number"
              step="0.01"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving || !editTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Updating...' : 'Save & Invalidate'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditTitle(item.title);
                setEditDescription(item.description ?? '');
                setEditPrice(
                  item.price !== undefined && item.price !== null ? item.price.toString() : ''
                );
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60 font-semibold">
                  #{item.id}
                </span>
                <h4 className="text-base font-semibold text-white group-hover:text-rose-300 transition-colors">
                  {item.title}
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {item.description || <span className="italic text-slate-600">No description provided</span>}
              </p>
            </div>

            {item.price !== null && item.price !== undefined && !isNaN(Number(item.price)) && (
              <span className="text-sm font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                ${Number(item.price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Single-item Cache Probe Result */}
          {singleCacheStatus && (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {singleCacheStatus.cache_hit ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Cache Hit
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Cache Miss (DB)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-slate-500" />
                {singleCacheStatus.latency_ms} ms
              </div>
            </div>
          )}

          {/* Card Footer / Actions */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-mono">
              Updated: {new Date(item.updated_at || item.created_at).toLocaleTimeString()}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTestSingleItemCache}
                disabled={isTestingSingle}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs transition-colors"
                title="Test individual item caching: GET /api/items/{id}"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSingle ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              <button
                onClick={handleOpenEdit}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
                title="Edit item (triggers cache invalidation)"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 text-xs transition-colors disabled:opacity-50"
                title="Delete item (triggers cache invalidation)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
