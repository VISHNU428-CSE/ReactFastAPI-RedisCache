import React, { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

interface ItemFormProps {
  onSubmit: (item: { title: string; description: string; price?: number }) => Promise<void>;
  isLoading: boolean;
}

export const ItemForm: React.FC<ItemFormProps> = ({ onSubmit, isLoading }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setError(null);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        price: price.trim() !== '' ? parseFloat(price) : undefined,
      });
      setTitle('');
      setDescription('');
      setPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-rose-400" />
          Add New Item
        </h3>
        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/60">
          Invalidates Redis Cache
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Item Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. High-speed Redis Cache Server"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe the item or cached resource..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm text-white placeholder-slate-500 outline-none transition-all resize-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Price / Metric ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 99.99"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !title.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving to DB & Invalidating Cache...
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              Create Item & Invalidate Cache
            </>
          )}
        </button>
      </form>
    </div>
  );
};
