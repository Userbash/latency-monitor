import { Socket } from 'net';

const MIN_SAMPLES = 3;
const MAX_SAMPLES = 100;
const DEFAULT_HOST = '8.8.8.8';
const PROBE_PORTS = [53, 443] as const;
const SAMPLE_TIMEOUT_MS = 2000;
const SAMPLE_DELAY_MS = 100;

function roundTo1(value: number): number {
  return Number(value.toFixed(1));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function logValidationWarning(message: string, details?: Record<string, unknown>): void {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  console.warn(`[network-validation] ${message}${payload}`);
}

function sanitizeNumberList(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value) && value >= 0);
}

function normalizeSampleCount(samples: number): number {
  if (!Number.isFinite(samples)) {
    logValidationWarning('Samples is not a finite number, fallback to minimum.', { samples });
    return MIN_SAMPLES;
  }

  const rounded = Math.round(samples);
  if (rounded < MIN_SAMPLES) {
    logValidationWarning('Samples is below minimum, clamped.', { samples: rounded, min: MIN_SAMPLES });
    return MIN_SAMPLES;
  }

  if (rounded > MAX_SAMPLES) {
    logValidationWarning('Samples is above maximum, clamped.', { samples: rounded, max: MAX_SAMPLES });
    return MAX_SAMPLES;
  }

  return rounded;
}

/**
 * Ping measurement result interface.
 * @property host - Host address
 * @property ping - Latency in milliseconds
 * @property success - Whether the measurement was successful
 * @property error - Error description (if any)
 */
export interface PingResult {
  host: string;
  ping: number; // milliseconds
  success: boolean;
  error?: string;
}

/**
 * Network test metrics interface.
 * @property testedHost - The host that was tested
 * @property ping - Average ping
 * @property jitter - Average jitter
 * @property packetLoss - Packet loss percentage
 * @property p95 - 95th percentile latency
 * @property spikeRate - Spike frequency
 * @property bufferbloat - Bufferbloat metric
 * @property status - Quality rating ('Excellent', 'Good', 'Fair', 'Poor')
 * @property score - Numeric rating
 * @property recommendation - Improvement recommendation
 */
export interface NetworkMetrics {
  testedHost: string;
  ping: number;
  jitter: number;
  packetLoss: number;
  p95: number;
  spikeRate: number;
  bufferbloat: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  score: number;
  recommendation: string;
}

/**
 * Network test progress stages.
 */
type ProgressStage = 'probing-targets' | 'running-samples' | 'computing-results';

/**
 * Interface for passing test progress.
 * @property stage - Current stage
 * @property progress - Completion percentage
 * @property currentMetrics - Current metrics
 * @property host - Current host
 */
export interface ProgressPayload {
  stage: ProgressStage;
  progress: number;
  currentMetrics: {
    ping: number;
    jitter: number;
    packetLoss: number;
  };
  host: string;
}

/**
 * Measures TCP connection time to a host:port.
 * Uses Node.js native 'net' module, compatible with Electron Main process.
 * @param host - Host address
 * @param port - Port (defaults to 80)
 * @param timeout - Timeout in ms (defaults to 2000)
 * @returns Promise<PingResult>
 */
export async function measureTcpPing(host: string, port = 80, timeout = 2000): Promise<PingResult> {
  return new Promise((resolve) => {
    const start = process.hrtime();
    const socket = new Socket();

    const onConnect = () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const ms = (seconds * 1000) + (nanoseconds / 1e6);
      socket.destroy();
      resolve({ host, ping: ms, success: true });
    };

    const onError = (err: Error) => {
      socket.destroy();
      resolve({ host, ping: -1, success: false, error: err.message });
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ host, ping: -1, success: false, error: 'Timeout' });
    });

    socket.connect(port, host, onConnect);
    socket.on('error', onError);
  });
}

/**
 * Helper function to calculate jitter.
 * @param pings - Array of latencies
 * @returns Average jitter
 */
function calculateJitterHelper(pings: number[]): number {
  if (pings.length < 2) return 0;
  let jitterSum = 0;
  for (let i = 1; i < pings.length; i++) {
    jitterSum += Math.abs(pings[i] - pings[i - 1]);
  }
  return jitterSum / (pings.length - 1);
}

/**
 * Calculates Jitter (variation in latency).
 * Formula: Sum(|Ping_i - Ping_i-1|) / (N-1)
 * @param pings - Array of latencies
 * @returns Average jitter
 */
export function calculateJitter(pings: number[]): number {
  return calculateJitterHelper(sanitizeNumberList(pings));
}

/**
 * Calculates packet loss percentage.
 * @param totalRequests - Total number of requests
 * @param successfulRequests - Number of successful requests
 * @returns Loss percentage
 */
export function calculatePacketLoss(totalRequests: number, successfulRequests: number): number {
  if (!Number.isFinite(totalRequests) || !Number.isFinite(successfulRequests)) {
    logValidationWarning('Packet loss input contains non-finite values.', {
      totalRequests,
      successfulRequests,
    });
    return 0;
  }

  if (totalRequests <= 0) return 0;

  const boundedSuccess = Math.min(Math.max(successfulRequests, 0), totalRequests);
  return ((totalRequests - boundedSuccess) / totalRequests) * 100;
}

/**
 * Calculates P95 latency.
 * @param pings - Array of latencies
 * @returns p95
 */
export function calculateP95(pings: number[]): number {
  const sanitized = sanitizeNumberList(pings);
  if (sanitized.length === 0) return 0;
  const sorted = [...sanitized].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function calculateSpikeRate(pings: number[]): number {
  const sanitized = sanitizeNumberList(pings);
  if (sanitized.length === 0) return 0;
  const avg = sanitized.reduce((sum, item) => sum + item, 0) / sanitized.length;
  const threshold = Math.max(80, avg * 1.5);
  const spikes = sanitized.filter((value) => value > threshold).length;
  return (spikes / sanitized.length) * 100;
}

export function calculateBufferbloat(avgPing: number, p95: number): number {
  return Math.max(0, p95 - avgPing);
}

function normalizeHosts(hostOrHosts: string | string[]): string[] {
  if (Array.isArray(hostOrHosts)) {
    const cleaned = hostOrHosts
      .map((item) => item.trim())
      .filter((item, index, all) => {
        if (!item) return false;
        return all.indexOf(item) === index;
      });

    if (cleaned.length !== hostOrHosts.length) {
      logValidationWarning('Host list was normalized (empty or duplicate values removed).', {
        original: hostOrHosts.length,
        normalized: cleaned.length,
      });
    }

    return cleaned.length > 0 ? cleaned : [DEFAULT_HOST];
  }

  const singleHost = hostOrHosts.trim();
  if (!singleHost) {
    logValidationWarning('Single host is empty, fallback to default host.');
    return [DEFAULT_HOST];
  }

  return [singleHost];
}

async function selectBestHost(hosts: string[]): Promise<string> {
  let bestHost = hosts[0];
  let bestLatency = Number.POSITIVE_INFINITY;

  for (const host of hosts) {
    const probes = await Promise.all(PROBE_PORTS.map((port) => measureTcpPing(host, port, SAMPLE_TIMEOUT_MS)));

    const successful = probes.filter((item) => item.success).map((item) => item.ping);
    if (successful.length === 0) {
      continue;
    }

    const avg = average(successful);
    if (avg < bestLatency) {
      bestLatency = avg;
      bestHost = host;
    }
  }

  return bestHost;
}

function buildRecommendation(metrics: Omit<NetworkMetrics, 'recommendation'>): string {
  if (metrics.packetLoss >= 5) {
    return 'High packet loss detected. Prefer wired Ethernet, stop heavy downloads and check router signal quality.';
  }

  if (metrics.bufferbloat >= 40) {
    return 'Bufferbloat is high. Enable SQM/QoS on the router and limit upload-heavy background traffic.';
  }

  if (metrics.spikeRate >= 20 || metrics.jitter >= 20) {
    return 'Latency spikes are frequent. Keep game server region close and reduce concurrent network usage.';
  }

  if (metrics.ping > 70) {
    return 'Ping is elevated. Select a closer game region or contact your ISP to improve routing quality.';
  }

  return 'Connection quality is stable for competitive play. Keep this setup for best results.';
}

/**
 * Simulates a full network test sequence.
 * In a real scenario, this would ping multiple targets multiple times.
 */
export async function runNetworkTest(
  hostOrHosts: string | string[] = DEFAULT_HOST,
  samples = 10,
  onProgress?: (payload: ProgressPayload) => void
): Promise<NetworkMetrics> {
  // Normalize early so the rest of the flow can assume non-empty host list and valid sample bounds.
  const hosts = normalizeHosts(hostOrHosts);
  const safeSamples = normalizeSampleCount(samples);

  onProgress?.({
    stage: 'probing-targets',
    progress: 5,
    currentMetrics: { ping: 0, jitter: 0, packetLoss: 0 },
    host: hosts[0],
  });

  const bestHost = await selectBestHost(hosts);

  onProgress?.({
    stage: 'running-samples',
    progress: 10,
    currentMetrics: { ping: 0, jitter: 0, packetLoss: 0 },
    host: bestHost,
  });

  const pings: number[] = [];
  let successCount = 0;
  let pingTotal = 0;
  let jitterDeltaSum = 0;

  for (let i = 0; i < safeSamples; i++) {
    const result = await measureTcpPing(bestHost, 443, SAMPLE_TIMEOUT_MS);
    
    if (result.success && Number.isFinite(result.ping) && result.ping >= 0) {
      if (pings.length > 0) {
        jitterDeltaSum += Math.abs(result.ping - pings[pings.length - 1]);
      }
      pings.push(result.ping);
      pingTotal += result.ping;
      successCount++;
    } else if (result.success) {
      logValidationWarning('Ping sample ignored due to invalid value.', {
        host: bestHost,
        ping: result.ping,
      });
    }
    
    // Keep progress updates lightweight: maintain running aggregates instead of repeated full-array scans.
    const currentAvgPing = pings.length > 0 ? pingTotal / pings.length : 0;
    const currentJitter = pings.length > 1 ? jitterDeltaSum / (pings.length - 1) : 0;
    const currentPacketLoss = calculatePacketLoss(i + 1, successCount);
    
    onProgress?.({
      stage: 'running-samples',
      progress: 10 + (((i + 1) / safeSamples) * 80),
      currentMetrics: {
        ping: roundTo1(currentAvgPing),
        jitter: roundTo1(currentJitter),
        packetLoss: roundTo1(currentPacketLoss),
      },
      host: bestHost,
    });
    
    // Small delay between pings
    await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS));
  }

  const avgPing = pings.length > 0 ? pingTotal / pings.length : 0;
  const jitter = calculateJitter(pings);
  const packetLoss = calculatePacketLoss(safeSamples, successCount);
  const p95 = calculateP95(pings);
  const spikeRate = calculateSpikeRate(pings);
  const bufferbloat = calculateBufferbloat(avgPing, p95);
  
  // Weighted penalties are tuned to make packet loss and jitter impact score more than raw latency.
  let score = 100;
  if (avgPing > 20) score -= (avgPing - 20) * 0.5;
  score -= jitter * 2;
  score -= packetLoss * 5;
  score -= spikeRate * 0.7;
  score -= bufferbloat * 0.6;
  
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Human-readable status bands for UI labels.
  let status: NetworkMetrics['status'] = 'Excellent';
  if (score < 90) status = 'Good';
  if (score < 70) status = 'Fair';
  if (score < 50) status = 'Poor';

  const baseMetrics: Omit<NetworkMetrics, 'recommendation'> = {
    testedHost: bestHost,
    ping: roundTo1(avgPing),
    jitter: roundTo1(jitter),
    packetLoss: roundTo1(packetLoss),
    p95: roundTo1(p95),
    spikeRate: roundTo1(spikeRate),
    bufferbloat: roundTo1(bufferbloat),
    status,
    score: Math.round(score)
  };

  onProgress?.({
    stage: 'computing-results',
    progress: 98,
    currentMetrics: {
      ping: baseMetrics.ping,
      jitter: baseMetrics.jitter,
      packetLoss: baseMetrics.packetLoss,
    },
    host: bestHost,
  });

  const metrics: NetworkMetrics = {
    ...baseMetrics,
    recommendation: buildRecommendation(baseMetrics),
  };
  
  return metrics;
}
