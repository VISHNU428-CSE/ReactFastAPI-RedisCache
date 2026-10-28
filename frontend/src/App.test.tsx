import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import * as api from './api';

vi.mock('./api', () => ({
  getHealth: vi.fn(),
  getItems: vi.fn(),
  getItem: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(),
}));

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application title, health status, and fetched items with cache status', async () => {
    vi.mocked(api.getHealth).mockResolvedValue({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
    });

    vi.mocked(api.getItems).mockResolvedValue({
      items: [
        {
          id: 1,
          title: 'Cached Product',
          description: 'A product stored in PostgreSQL and cached in Redis',
          price: 29.99,
          created_at: '2026-10-11T10:00:00Z',
          updated_at: '2026-10-11T10:00:00Z',
        },
      ],
      cache_hit: true,
      latency_ms: 2.4,
      cached_at: '2026-10-11T10:05:00Z',
    });

    render(<App />);

    expect(screen.getByText(/FastAPI \+ Redis Cache/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Cached Product')).toBeInTheDocument();
      expect(screen.getByText('⚡ CACHE HIT')).toBeInTheDocument();
      expect(screen.getByText('2.4 ms')).toBeInTheDocument();
    });
  });

  it('displays error state when API fails to load', async () => {
    vi.mocked(api.getHealth).mockRejectedValue(new Error('Backend offline'));
    vi.mocked(api.getItems).mockRejectedValue(new Error('Cannot connect to backend'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Cannot connect to backend/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();
    });
  });

  it('regression: renders items list when API returns null prices without crashing or blank screen', async () => {
    vi.mocked(api.getHealth).mockResolvedValue({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
    });

    vi.mocked(api.getItems).mockResolvedValue({
      items: [
        {
          id: 1,
          title: 'Unpriced Item 1',
          description: 'No price set',
          price: null,
          created_at: '2026-10-11T10:00:00Z',
          updated_at: '2026-10-11T10:00:00Z',
        },
        {
          id: 2,
          title: 'Priced Item 2',
          description: 'Valid price',
          price: 199.99,
          created_at: '2026-10-11T10:00:00Z',
          updated_at: '2026-10-11T10:00:00Z',
        },
      ],
      cache_hit: false,
      latency_ms: 3.2,
      cached_at: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Unpriced Item 1')).toBeInTheDocument();
      expect(screen.getByText('Priced Item 2')).toBeInTheDocument();
      expect(screen.getByText('$199.99')).toBeInTheDocument();
    });
  });
});
