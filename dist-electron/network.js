import { Socket } from 'net';
/**
 * Measures TCP connection time to a host:port.
 * Uses Node.js native 'net' module, compatible with Electron Main process.
 */
export async function measureTcpPing(host, port = 80, timeout = 2000) {
    return new Promise((resolve) => {
        const start = process.hrtime();
        const socket = new Socket();
        const onConnect = () => {
            const [seconds, nanoseconds] = process.hrtime(start);
            const ms = (seconds * 1000) + (nanoseconds / 1e6);
            socket.destroy();
            resolve({ host, ping: ms, success: true });
        };
        const onError = (err) => {
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
function calculateJitterHelper(pings) {
    if (pings.length < 2)
        return 0;
    let jitterSum = 0;
    for (let i = 1; i < pings.length; i++) {
        jitterSum += Math.abs(pings[i] - pings[i - 1]);
    }
    return jitterSum / (pings.length - 1);
}
/**
 * Calculates Jitter (variation in latency).
 * Formula: Sum(|Ping_i - Ping_i-1|) / (N-1)
 */
export function calculateJitter(pings) {
    return calculateJitterHelper(pings);
}
/**
 * Calculates packet loss percentage.
 */
export function calculatePacketLoss(totalRequests, successfulRequests) {
    if (totalRequests === 0)
        return 0;
    return ((totalRequests - successfulRequests) / totalRequests) * 100;
}
/**
 * Calculates P95 latency.
 */
export function calculateP95(pings) {
    if (pings.length === 0)
        return 0;
    const sorted = [...pings].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[index];
}
export function calculateSpikeRate(pings) {
    if (pings.length === 0)
        return 0;
    const avg = pings.reduce((sum, item) => sum + item, 0) / pings.length;
    const threshold = Math.max(80, avg * 1.5);
    const spikes = pings.filter((value) => value > threshold).length;
    return (spikes / pings.length) * 100;
}
export function calculateBufferbloat(avgPing, p95) {
    return Math.max(0, p95 - avgPing);
}
function normalizeHosts(hostOrHosts) {
    if (Array.isArray(hostOrHosts)) {
        const cleaned = hostOrHosts.map((item) => item.trim()).filter(Boolean);
        return cleaned.length > 0 ? cleaned : ['8.8.8.8'];
    }
    return hostOrHosts.trim() ? [hostOrHosts.trim()] : ['8.8.8.8'];
}
async function selectBestHost(hosts) {
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
function buildRecommendation(metrics) {
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
export async function runNetworkTest(hostOrHosts = '8.8.8.8', samples = 10, onProgress) {
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
    const pings = [];
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
    if (avgPing > 20)
        score -= (avgPing - 20) * 0.5;
    score -= jitter * 2;
    score -= packetLoss * 5;
    score -= spikeRate * 0.7;
    score -= bufferbloat * 0.6;
    if (score < 0)
        score = 0;
    if (score > 100)
        score = 100;
    // Determine Status based on Score
    let status = 'Excellent';
    if (score < 90)
        status = 'Good';
    if (score < 70)
        status = 'Fair';
    if (score < 50)
        status = 'Poor';
    const baseMetrics = {
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
    const metrics = {
        ...baseMetrics,
        recommendation: buildRecommendation(baseMetrics),
    };
    return metrics;
}
