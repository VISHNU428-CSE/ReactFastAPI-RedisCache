import type { Item, ItemsResponse, SingleItemResponse, CacheStats, HealthResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.DEV ? 'http://localhost:8000' : '');

async function request<T>(path: string, options?: RequestInit): Promise<{ data: T; headers: Headers; roundtrip_ms: number }> {
  const start = performance.now();
  const url = `${API_BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const roundtrip_ms = Math.round((performance.now() - start) * 10) / 10;

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return { data, headers: res.headers, roundtrip_ms };
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Load failed') || err.message.includes('NetworkError'))) {
      const target = API_BASE_URL || window.location.origin;
      throw new Error(`Cannot connect to backend at ${target}. Ensure FastAPI is running.`);
    }
    throw err;
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await request<HealthResponse>('/health');
  return data;
}

export async function getItems(): Promise<ItemsResponse> {
  const { data, headers, roundtrip_ms } = await request<any>('/api/items');
  
  // Normalize response: whether backend returns envelope { items: [...], cache_hit: ... }
  // or plain list [...] with X-Cache header
  const isCacheHit = data.cache_hit !== undefined 
    ? Boolean(data.cache_hit) 
    : (headers.get('X-Cache')?.toUpperCase() === 'HIT');

  const latency = data.latency_ms !== undefined ? data.latency_ms : roundtrip_ms;

  return {
    items: Array.isArray(data) ? data : (data.items || []),
    cache_hit: isCacheHit,
    latency_ms: latency,
    cached_at: data.cached_at || null,
  };
}

export async function getItem(id: number): Promise<SingleItemResponse> {
  const { data, headers, roundtrip_ms } = await request<any>(`/api/items/${id}`);

  const isCacheHit = data.cache_hit !== undefined
    ? Boolean(data.cache_hit)
    : (headers.get('X-Cache')?.toUpperCase() === 'HIT');

  const latency = data.latency_ms !== undefined ? data.latency_ms : roundtrip_ms;

  return {
    item: data.item || data,
    cache_hit: isCacheHit,
    latency_ms: latency,
    cached_at: data.cached_at || null,
  };
}

export async function createItem(item: { title: string; description: string; price?: number }): Promise<Item> {
  const { data } = await request<any>('/api/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return data.item || data;
}

export async function updateItem(id: number, item: { title: string; description: string; price?: number }): Promise<Item> {
  const { data } = await request<any>(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
  return data.item || data;
}

export async function deleteItem(id: number): Promise<void> {
  await request<any>(`/api/items/${id}`, {
    method: 'DELETE',
  });
}

export async function clearCache(): Promise<{ status: string }> {
  const { data } = await request<{ status: string }>('/api/cache/clear', {
    method: 'POST',
  });
  return data;
}

export async function getCacheStats(): Promise<CacheStats> {
  try {
    const { data } = await request<CacheStats>('/api/cache/stats');
    return data;
  } catch {
    return { connected: false };
  }
}
