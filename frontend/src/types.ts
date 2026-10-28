export interface Item {
  id: number;
  title: string;
  description: string | null;
  price?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ItemsResponse {
  items: Item[];
  cache_hit: boolean;
  latency_ms: number;
  cached_at: string | null;
}

export interface SingleItemResponse {
  item: Item;
  cache_hit: boolean;
  latency_ms: number;
  cached_at?: string | null;
}

export interface CacheStats {
  keys?: number;
  connected: boolean;
  ttl_seconds?: number;
  hits?: number;
  misses?: number;
}

export interface HealthResponse {
  status: string;
  database: string;
  redis: string;
}
