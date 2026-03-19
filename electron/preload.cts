import { contextBridge, ipcRenderer } from 'electron';

type WindowCommand = 'minimize' | 'maximize' | 'close';

interface OpenExternalResult {
  ok: boolean;
  error?: string;
}

interface ScreenshotResult {
  ok: boolean;
  path?: string;
  error?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  windowControl: (command: WindowCommand) => ipcRenderer.send('window-controls', command),

  startNetworkTest: (profile: { host?: string; targets?: string[]; samples?: number }) =>
    ipcRenderer.send('start-network-test', profile),

  openExternal: (url: string): Promise<OpenExternalResult> => ipcRenderer.invoke('open-external', url),

  captureScreenshot: (): Promise<ScreenshotResult> => ipcRenderer.invoke('capture-screenshot'),

  onTestProgress: (
    callback: (data: {
      stage: string;
      progress: number;
      host: string;
      currentMetrics: { ping: number; jitter: number; packetLoss: number };
    }) => void
  ) => {
    const subscription = (
      _event: unknown,
      data: {
        stage: string;
        progress: number;
        host: string;
        currentMetrics: { ping: number; jitter: number; packetLoss: number };
      }
    ) => callback(data);

    ipcRenderer.on('test-progress', subscription);
    return () => ipcRenderer.removeListener('test-progress', subscription);
  },

  onTestComplete: (callback: (data: unknown) => void) => {
    const subscription = (_event: unknown, data: unknown) => callback(data);
    ipcRenderer.on('test-complete', subscription);
    return () => ipcRenderer.removeListener('test-complete', subscription);
  },

  onTestError: (callback: (message: string) => void) => {
    const subscription = (_event: unknown, message: string) => callback(message);
    ipcRenderer.on('test-error', subscription);
    return () => ipcRenderer.removeListener('test-error', subscription);
  },
});
