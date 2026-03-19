import { describe, test, expect } from 'vitest';
import {
  calculateBufferbloat,
  calculateJitter,
  calculateP95,
  calculatePacketLoss,
  calculateSpikeRate,
} from '../../electron/network';

describe('Network Metrics', () => {
  test('calculateJitter returns correct value', () => {
    const pings = [10, 20, 30, 40];
    expect(calculateJitter(pings)).toBeCloseTo(10);
  });

  test('calculateJitter ignores invalid values', () => {
    const pings = [10, Number.NaN, -5, 20, 40];
    expect(calculateJitter(pings)).toBeCloseTo(15);
  });

  test('calculatePacketLoss returns correct percentage', () => {
    expect(calculatePacketLoss(100, 90)).toBeCloseTo(10);
    expect(calculatePacketLoss(0, 0)).toBe(0);
    expect(calculatePacketLoss(10, 20)).toBe(0);
    expect(calculatePacketLoss(10, -3)).toBe(100);
  });

  test('calculateP95 returns correct percentile', () => {
    const pings = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    expect(calculateP95(pings)).toBe(95);
  });

  test('calculateP95 returns 0 on invalid input list', () => {
    expect(calculateP95([Number.NaN, -1])).toBe(0);
  });

  test('calculateSpikeRate returns expected value', () => {
    expect(calculateSpikeRate([10, 10, 200, 10])).toBe(25);
  });

  test('calculateBufferbloat never returns negative', () => {
    expect(calculateBufferbloat(40, 20)).toBe(0);
    expect(calculateBufferbloat(20, 40)).toBe(20);
  });
});
