import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App';

const mockMetrics = {
  testedHost: 'api.steampowered.com',
  ping: 20,
  jitter: 3,
  packetLoss: 0,
  p95: 28,
  spikeRate: 2,
  bufferbloat: 8,
  status: 'Excellent' as const,
  score: 95,
  recommendation: 'Connection quality is stable for competitive play. Keep this setup for best results.',
};

describe('App interactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('starts network test in web mode and renders metrics', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ results: mockMetrics }),
    } as Response);

    render(<App />);

    fireEvent.click(screen.getByTestId('start-test-btn'));

    await waitFor(() => {
      expect(screen.getByText('Finished')).toBeTruthy();
    });

    expect(screen.getByText('95')).toBeTruthy();
    expect(screen.getAllByText('api.steampowered.com').length).toBeGreaterThan(0);
  });

  test('switches mode and keeps buttons clickable', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Social' }));
    expect(screen.getByRole('button', { name: 'YouTube' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Games' }));
    expect(screen.getByRole('button', { name: 'CS2' })).toBeTruthy();
  });
});
