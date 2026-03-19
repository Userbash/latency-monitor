import { Socket } from 'net';

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
  return calculateJitterHelper(pings);
}

/**
 * Calculates packet loss percentage.
 * @param totalRequests - Total number of requests
 * @param successfulRequests - Number of successful requests
 * @returns Loss percentage
 */
export function calculatePacketLoss(totalRequests: number, successfulRequests: number): number {
  if (totalRequests === 0) return 0;
  return ((totalRequests - successfulRequests) / totalRequests) * 100;
}

/**
 * Calculates P95 latency.
 * @param pings - Array of latencies
 * @returns p95
 */
export function calculateP95(pings: number[]): number {
  if (pings.length === 0) return 0;
  const sorted = [...pings].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[index];
}

export function calculateSpikeRate(pings: number[]): number {
  if (pings.length === 0) return 0;
  const avg = pings.reduce((sum, item) => sum + item, 0) / pings.length;
  const threshold = Math.max(80, avg * 1.5);
  const spikes = pings.filter((value) => value > threshold).length;
  return (spikes / pings.length) * 100;
}

export function calculateBufferbloat(avgPing: number, p95: number): number {
  return Math.max(0, p95 - avgPing);
}

function normalizeHosts(hostOrHosts: string | string[]): string[] {
  if (Array.isArray(hostOrHosts)) {
    const cleaned = hostOrHosts.map((item) => item.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : ['8.8.8.8'];
  }

  return hostOrHosts.trim() ? [hostOrHosts.trim()] : ['8.8.8.8'];
}

async function selectBestHost(hosts: string[]): Promise<string> {
  let bestHost = hosts[0];
  let bestLatency = Number.POSITIVE_INFINITY;

  for (const host of hosts) {
    const probes = await Promise.all([
      measureTcpPing(host, 53, 2000),
      measureTcpPing(host, 443, 2000),
    ]);

    const successful = probes.filter((item) => item.success).map((item) => item.ping);
    if (successful.length === 0) {
      continue;
    }

    const avg = successful.reduce((sum, value) => sum + value, 0) / successful.length;
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
  hostOrHosts: string | string[] = '8.8.8.8',
  samples = 10,
  onProgress?: (payload: ProgressPayload) => void
): Promise<NetworkMetrics> {
  const hosts = normalizeHosts(hostOrHosts);
  const safeSamples = Math.max(3, samples);

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

  for (let i = 0; i < safeSamples; i++) {
    const result = await measureTcpPing(bestHost, 443, 2000);
    
    if (result.success) {
      pings.push(result.ping);
      successCount++;
    }
    
    // Calculate intermediate metrics
    const currentAvgPing = pings.length > 0 ? pings.reduce((a, b) => a + b, 0) / pings.length : 0;
    const currentJitter = calculateJitter(pings);
    const currentPacketLoss = calculatePacketLoss(i + 1, successCount);
    
    onProgress?.({
      stage: 'running-samples',
      progress: 10 + (((i + 1) / safeSamples) * 80),
      currentMetrics: {
        ping: currentAvgPing,
        jitter: currentJitter,
        packetLoss: currentPacketLoss,
      },
      host: bestHost,
    });
    
    // Small delay between pings
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgPing = pings.length > 0 ? pings.reduce((a, b) => a + b, 0) / pings.length : 0;
  const jitter = calculateJitter(pings);
  const packetLoss = calculatePacketLoss(safeSamples, successCount);
  const p95 = calculateP95(pings);
  const spikeRate = calculateSpikeRate(pings);
  const bufferbloat = calculateBufferbloat(avgPing, p95);
  
  // Calculate Score (Simple Algorithm)
  // Max score 100.
  // Ping: -1 per ms over 20ms
  // Jitter: -2 per ms
  // Loss: -20 per 1%
  let score = 100;
  if (avgPing > 20) score -= (avgPing - 20) * 0.5;
  score -= jitter * 2;
  score -= packetLoss * 5;
  score -= spikeRate * 0.7;
  score -= bufferbloat * 0.6;
  
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Determine Status based on Score
  let status: NetworkMetrics['status'] = 'Excellent';
  if (score < 90) status = 'Good';
  if (score < 70) status = 'Fair';
  if (score < 50) status = 'Poor';

  const baseMetrics: Omit<NetworkMetrics, 'recommendation'> = {
    testedHost: bestHost,
    ping: parseFloat(avgPing.toFixed(1)),
    jitter: parseFloat(jitter.toFixed(1)),
    packetLoss: parseFloat(packetLoss.toFixed(1)),
    p95: parseFloat(p95.toFixed(1)),
    spikeRate: parseFloat(spikeRate.toFixed(1)),
    bufferbloat: parseFloat(bufferbloat.toFixed(1)),
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
