import { describe, expect, test, vi } from 'vitest';
import * as networkModule from '../../electron/network';

describe('runNetworkTest', () => {
  test('normalizes host list and samples with progress', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pingSpy = vi
      .spyOn(networkModule, 'measureTcpPing')
      .mockResolvedValue({ host: '8.8.8.8', ping: 20, success: true });

    const progress: networkModule.ProgressPayload[] = [];

    const result = await networkModule.runNetworkTest(['', '8.8.8.8', '8.8.8.8'], 1, (payload) => {
      progress.push(payload);
    });

    expect(result.testedHost).toBe('8.8.8.8');
    expect(result.ping).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[0].stage).toBe('probing-targets');
    expect(progress.some((item) => item.stage === 'computing-results')).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    pingSpy.mockRestore();
  });

  test('ignores invalid ping samples', async () => {
    const pingSpy = vi
      .spyOn(networkModule, 'measureTcpPing')
      .mockResolvedValueOnce({ host: '1.1.1.1', ping: 10, success: true })
      .mockResolvedValueOnce({ host: '1.1.1.1', ping: 10, success: true })
      .mockResolvedValueOnce({ host: '1.1.1.1', ping: Number.NaN, success: true })
      .mockResolvedValue({ host: '1.1.1.1', ping: 15, success: true });

    const result = await networkModule.runNetworkTest('1.1.1.1', 3);

    expect(result.ping).toBeGreaterThan(0);
    expect(Number.isFinite(result.ping)).toBe(true);

    pingSpy.mockRestore();
  });
});
