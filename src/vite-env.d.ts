
/// <reference types="vite/client" />

interface NetworkMetrics {
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

interface ProgressEventPayload {
  stage: 'probing-targets' | 'running-samples' | 'computing-results';
  progress: number;
  host: string;
  currentMetrics: {
    ping: number;
    jitter: number;
    packetLoss: number;
  };
}

interface Window {
  electronAPI: {
    windowControl: (command: 'minimize' | 'maximize' | 'close') => void;
    startNetworkTest: (profile: { host?: string; targets?: string[]; samples?: number }) => void;
    openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>;
    getSystemLocale: () => Promise<string>;
    captureScreenshot: () => Promise<{ ok: boolean; path?: string; error?: string }>;
    onTestProgress: (callback: (data: ProgressEventPayload) => void) => () => void;
    onTestComplete: (callback: (results: NetworkMetrics) => void) => () => void;
    onTestError: (callback: (message: string) => void) => () => void;
  };
}
