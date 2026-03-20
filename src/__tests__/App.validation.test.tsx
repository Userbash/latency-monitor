import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App';

describe('App validation behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
    });
  });

  test('shows backend error when API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    render(<App />);
    fireEvent.click(screen.getByTestId('start-test-btn'));

    await waitFor(() => {
      expect(screen.getByText('Backend is not reachable')).toBeTruthy();
    });

    expect(screen.getByText('Error')).toBeTruthy();
  });

  test('shows backend error when API payload is malformed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    } as Response);

    render(<App />);
    fireEvent.click(screen.getByTestId('start-test-btn'));

    await waitFor(() => {
      expect(screen.getByText('Backend is not reachable')).toBeTruthy();
    });
  });
});
