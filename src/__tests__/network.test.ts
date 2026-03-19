import { describe, test, expect } from 'vitest';
import { measureTcpPing, calculateJitter, calculatePacketLoss, calculateP95 } from '../../electron/network';

describe('Network Metrics', () => {
  test('calculateJitter returns correct value', () => {
    const pings = [10, 20, 30, 40];
    expect(calculateJitter(pings)).toBeCloseTo(10);
  });

  test('calculatePacketLoss returns correct percentage', () => {
    expect(calculatePacketLoss(100, 90)).toBeCloseTo(10);
    expect(calculatePacketLoss(0, 0)).toBe(0);
  });

  test('calculateP95 returns correct percentile', () => {
    const pings = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    expect(calculateP95(pings)).toBe(95);
  });

  test('measureTcpPing returns result', async () => {
    const result = await measureTcpPing('8.8.8.8', 80, 1000);
    expect(result).toHaveProperty('host');
    expect(result).toHaveProperty('ping');
    expect(result).toHaveProperty('success');
  });
});
