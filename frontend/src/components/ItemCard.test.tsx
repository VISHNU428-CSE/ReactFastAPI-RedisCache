import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ItemCard } from './ItemCard';
import * as api from '../api';

vi.mock('../api', () => ({
  getItem: vi.fn(),
}));

describe('ItemCard', () => {
  const mockItem = {
    id: 10,
    title: 'Test Cache Item',
    description: null,
    price: 19.99,
    created_at: '2026-10-11T10:00:00Z',
    updated_at: '2026-10-11T10:00:00Z',
  };

  it('renders item with null description without crashing', () => {
    render(<ItemCard item={mockItem} onUpdate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Test Cache Item')).toBeInTheDocument();
    expect(screen.getByText(/No description provided/i)).toBeInTheDocument();
  });

  it('regression: safely renders item with null price without calling toFixed or crashing', () => {
    const itemWithNullPrice = {
      id: 99,
      title: 'Item With Null Price',
      description: 'Legacy or unpriced item from database',
      price: null,
      created_at: '2026-10-11T10:00:00Z',
      updated_at: '2026-10-11T10:00:00Z',
    };

    render(<ItemCard item={itemWithNullPrice} onUpdate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Item With Null Price')).toBeInTheDocument();
    // Price badge should not exist since price is null
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();

    // Verify entering edit mode works seamlessly and sets edit price input to empty
    const editBtn = screen.getByTitle(/Edit item/i);
    fireEvent.click(editBtn);

    const priceInput = screen.getByLabelText(/Price \(\$\)/i);
    expect(priceInput).toHaveValue(null);
  });

  it('correctly renders item with zero price ($0.00) without suppressing it', () => {
    const itemWithZeroPrice = {
      id: 101,
      title: 'Free Item',
      description: 'Zero cost promotional item',
      price: 0,
      created_at: '2026-10-11T10:00:00Z',
      updated_at: '2026-10-11T10:00:00Z',
    };

    render(<ItemCard item={itemWithZeroPrice} onUpdate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Free Item')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('allows entering edit mode and safely saves with trimmed values when description is null', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    render(<ItemCard item={mockItem} onUpdate={handleUpdate} onDelete={vi.fn()} />);

    const editBtn = screen.getByTitle(/Edit item/i);
    fireEvent.click(editBtn);

    const descInput = screen.getAllByRole('textbox')[1]; // textarea is second textbox after title input
    expect(descInput).toHaveValue('');

    await act(async () => {
      fireEvent.change(descInput, { target: { value: '  Updated description   ' } });
    });

    const saveBtn = screen.getByRole('button', { name: /Save & Invalidate/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdate).toHaveBeenCalledWith(10, {
      title: 'Test Cache Item',
      description: 'Updated description',
      price: 19.99,
    });
  });

  it('tests single-item cache lookup via getItem', async () => {
    vi.mocked(api.getItem).mockResolvedValue({
      item: { ...mockItem, description: 'Fresh' },
      cache_hit: true,
      latency_ms: 0.8,
    });

    render(<ItemCard item={mockItem} onUpdate={vi.fn()} onDelete={vi.fn()} />);

    const probeBtn = screen.getByTitle(/Test individual item caching/i);
    await act(async () => {
      fireEvent.click(probeBtn);
    });

    expect(api.getItem).toHaveBeenCalledWith(10);
    expect(await screen.findByText(/Cache Hit/i)).toBeInTheDocument();
    expect(screen.getByText(/0.8 ms/i)).toBeInTheDocument();
  });

  it('regression: price survives edit, save, reload (prop update), and edit-form reopening', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    const itemWithPrice = {
      id: 42,
      title: 'Item With Initial Price',
      description: 'Test description',
      price: 199.9,
      created_at: '2026-10-11T10:00:00Z',
      updated_at: '2026-10-11T10:00:00Z',
    };

    const { rerender } = render(
      <ItemCard item={itemWithPrice} onUpdate={handleUpdate} onDelete={vi.fn()} />
    );

    // Initial render shows price badge
    expect(screen.getByText('$199.90')).toBeInTheDocument();

    // 1. Open edit mode: price field should be initialized to 199.9
    const editBtn = screen.getByTitle(/Edit item/i);
    fireEvent.click(editBtn);

    const priceInput = screen.getByLabelText(/Price \(\$\)/i);
    expect(priceInput).toHaveValue(199.9);

    // 2. Change price to 199.99 and save
    await act(async () => {
      fireEvent.change(priceInput, { target: { value: '199.99' } });
    });
    expect(priceInput).toHaveValue(199.99);

    const saveBtn = screen.getByRole('button', { name: /Save & Invalidate/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdate).toHaveBeenCalledWith(42, {
      title: 'Item With Initial Price',
      description: 'Test description',
      price: 199.99,
    });

    // 3. Simulate page reload / parent re-fetch with updated item
    const reloadedItem = {
      ...itemWithPrice,
      price: 199.99,
      updated_at: '2026-10-11T10:01:00Z',
    };
    rerender(<ItemCard item={reloadedItem} onUpdate={handleUpdate} onDelete={vi.fn()} />);

    // Verify updated price badge is rendered
    expect(screen.getByText('$199.99')).toBeInTheDocument();

    // 4. Reopen Edit form: price field must NOT be blank, must show 199.99
    const reopenEditBtn = screen.getByTitle(/Edit item/i);
    fireEvent.click(reopenEditBtn);

    const reopenedPriceInput = screen.getByLabelText(/Price \(\$\)/i);
    expect(reopenedPriceInput).toHaveValue(199.99);
  });
});
