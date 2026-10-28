import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ItemForm } from './ItemForm';

describe('ItemForm', () => {
  it('prevents submission when title is empty', () => {
    const handleSubmit = vi.fn();
    render(<ItemForm onSubmit={handleSubmit} isLoading={false} />);

    const submitBtn = screen.getByRole('button', { name: /Create Item/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submits form data when title is provided', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ItemForm onSubmit={handleSubmit} isLoading={false} />);

    const titleInput = screen.getByPlaceholderText(/e\.g\. High-speed Redis Cache Server/i);
    const descInput = screen.getByPlaceholderText(/Describe the item/i);
    const priceInput = screen.getByPlaceholderText(/e\.g\. 99\.99/i);
    const submitBtn = screen.getByRole('button', { name: /Create Item/i });

    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'New Test Item' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });
      fireEvent.change(priceInput, { target: { value: '49.99' } });
    });

    expect(submitBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'New Test Item',
      description: 'Test description',
      price: 49.99,
    });
  });
});
