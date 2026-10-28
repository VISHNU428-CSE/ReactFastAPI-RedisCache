import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CacheDemoBanner } from './CacheDemoBanner';

describe('CacheDemoBanner', () => {
  it('renders correctly with Cache Miss state', () => {
    render(
      <CacheDemoBanner
        lastCacheHit={false}
        lastLatencyMs={45.2}
        cachedAt={null}
        itemCount={3}
        onRunCacheDemo={vi.fn()}
        isRunningDemo={false}
      />
    );

    expect(screen.getByText('🐢 CACHE MISS')).toBeInTheDocument();
    expect(screen.getByText('45.2 ms')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders correctly with Cache Hit state', () => {
    render(
      <CacheDemoBanner
        lastCacheHit={true}
        lastLatencyMs={1.8}
        cachedAt="2026-10-11T12:00:00Z"
        itemCount={5}
        onRunCacheDemo={vi.fn()}
        isRunningDemo={false}
      />
    );

    expect(screen.getByText('⚡ CACHE HIT')).toBeInTheDocument();
    expect(screen.getByText('1.8 ms')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('invokes onRunCacheDemo when benchmark button is clicked', () => {
    const handleRun = vi.fn();
    render(
      <CacheDemoBanner
        lastCacheHit={null}
        lastLatencyMs={null}
        cachedAt={null}
        itemCount={0}
        onRunCacheDemo={handleRun}
        isRunningDemo={false}
      />
    );

    const btn = screen.getByRole('button', { name: /Run Cache-Miss vs Cache-Hit Test/i });
    fireEvent.click(btn);
    expect(handleRun).toHaveBeenCalledTimes(1);
  });
});
