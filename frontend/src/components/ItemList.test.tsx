import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemList } from './ItemList';

describe('ItemList', () => {
  it('renders empty database message when items array is empty', () => {
    render(
      <ItemList
        items={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
      />
    );

    expect(screen.getByText(/No Items in Database/i)).toBeInTheDocument();
  });

  it('renders error state with retry button when error occurs', () => {
    const handleRetry = vi.fn();
    render(
      <ItemList
        items={[]}
        isLoading={false}
        error="Network error connecting to backend"
        onRetry={handleRetry}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
      />
    );

    expect(screen.getByText(/Connection \/ API Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Network error connecting to backend/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders list of items', () => {
    const items = [
      {
        id: 1,
        title: 'Redis Fast Item',
        description: 'Cached description',
        created_at: '2026-10-11T10:00:00Z',
        updated_at: '2026-10-11T10:00:00Z',
      },
    ];

    render(
      <ItemList
        items={items}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
      />
    );

    expect(screen.getByText(/Cached Items Collection \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Redis Fast Item')).toBeInTheDocument();
  });
});
