import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runNetworkTest } from './network.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_DATA_DIR = 'EsportsNetworkMonitor';
const DEFAULT_TARGET = '8.8.8.8';
const DEFAULT_SAMPLES = 12;
const MIN_SAMPLES = 3;
const MAX_SAMPLES = 100;

type StartNetworkTestPayload = {
  host?: string;
  targets?: string[];
  samples?: number;
};

type WindowCommand = 'minimize' | 'maximize' | 'close';

function isWindowCommand(command: unknown): command is WindowCommand {
  return command === 'minimize' || command === 'maximize' || command === 'close';
}

function sanitizeStartTestPayload(payload: StartNetworkTestPayload | undefined): {
  targets: string[];
  samples: number;
} {
  // IPC payload is untrusted input from renderer; normalize and bound it before use.
  const rawTargets = Array.isArray(payload?.targets) ? payload.targets : [payload?.host || DEFAULT_TARGET];
  const targets = Array.from(
    new Set(
      rawTargets
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    )
  );

  const sampleCandidate = Number(payload?.samples);
  const safeSamples = Number.isFinite(sampleCandidate)
    ? Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, Math.round(sampleCandidate)))
    : DEFAULT_SAMPLES;

  return {
    // Always return at least one target so the worker never runs with an empty host set.
    targets: targets.length > 0 ? targets : [DEFAULT_TARGET],
    samples: safeSamples,
  };
}

function configureStoragePaths(): void {
  const appDataBase = app.getPath('appData');
  app.setPath('userData', path.join(appDataBase, APP_DATA_DIR, 'userData'));
  app.setPath('sessionData', path.join(appDataBase, APP_DATA_DIR, 'session'));
  app.setPath('cache', path.join(appDataBase, APP_DATA_DIR, 'cache'));
}

function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

configureStoragePaths();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let networkTestInProgress = false;

/**
 * Creates the main application window for Electron.
 * Configures the preload script, dimensions, and security parameters.
 * Connects event handlers for UI and security.
 */
const createWindow = () => {
  const preloadCjs = path.join(__dirname, 'preload.cjs');
  const preloadMjs = path.join(__dirname, 'preload.mjs');
  const preloadJs = path.join(__dirname, 'preload.js');
  const preloadPath = fs.existsSync(preloadCjs)
    ? preloadCjs
    : (fs.existsSync(preloadMjs) ? preloadMjs : preloadJs);

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    minWidth: 1100,
    minHeight: 780,
    resizable: true,
    frame: false, // Frameless window
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the index.html of the app.
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const shouldUseDevServer = !app.isPackaged && process.env.NODE_ENV !== 'test' && Boolean(devUrl);

  if (shouldUseDevServer && devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.on('context-menu', (event) => {
    // Clears the UI in release, prevents the standard Chromium menu from appearing.
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allows opening only safe external links.
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    // Hotkeys for DevTools (F12 or Ctrl+Shift+I).
    const isDevToolsShortcut =
      input.key === 'F12' ||
      (input.control && input.shift && (input.key.toLowerCase() === 'i'));

    if (!isDevToolsShortcut || !mainWindow) {
      return;
    }

    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
/**
 * Application ready event.
 * Creates the window and registers IPC handlers.
 */
app.whenReady().then(() => {
  createWindow();

  /**
   * IPC: Window management (minimize, maximize, close).
   */
  ipcMain.on('window-controls', (event, command: unknown) => {
    if (!mainWindow) return;

    if (!isWindowCommand(command)) {
      event.reply('test-error', 'Invalid window command received.');
      return;
    }

    switch (command) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  /**
   * IPC: Launch network test.
   * @param profile - Profile containing targets and sample count
   */
  ipcMain.on('start-network-test', async (event, profile: StartNetworkTestPayload | undefined) => {
    if (networkTestInProgress) {
      event.reply('test-error', 'A network test is already running. Please wait for completion.');
      return;
    }

    // Single-flight guard prevents overlapping test runs and inconsistent progress streams.
    const { targets, samples } = sanitizeStartTestPayload(profile);
    networkTestInProgress = true;

    try {
      const results = await runNetworkTest(targets, samples, (payload) => {
        if (mainWindow) {
          mainWindow.webContents.send('test-progress', payload);
        }
      });

      event.reply('test-complete', results);
    } catch (e) {
      event.reply('test-error', (e as Error).message);
    } finally {
      networkTestInProgress = false;
    }
  });

  /**
   * IPC: Open external link.
   * @param rawUrl - URL to open
   */
  ipcMain.handle('open-external', async (_event, rawUrl: string) => {
    const cleanedUrl = String(rawUrl ?? '').trim();
    if (!isAllowedExternalUrl(cleanedUrl)) {
      return { ok: false, error: 'Only http/https URLs are allowed.' };
    }

    await shell.openExternal(cleanedUrl);
    return { ok: true };
  });

  /**
   * IPC: Resolve system locale from OS settings.
   */
  ipcMain.handle('get-system-locale', () => {
    const preferred = app.getPreferredSystemLanguages();
    if (preferred.length > 0) {
      return preferred[0];
    }

    return app.getLocale();
  });

  /**
   * IPC: Capture window screenshot.
   */
  ipcMain.handle('capture-screenshot', async () => {
    if (!mainWindow) {
      return { ok: false, error: 'Main window is not available.' };
    }

    const image = await mainWindow.webContents.capturePage();
    const defaultPath = path.join(
      app.getPath('pictures'),
      `esports-network-monitor-${Date.now()}.png`
    );

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Screenshot',
      defaultPath,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });

    if (canceled || !filePath) {
      return { ok: false, error: 'Save was canceled.' };
    }

    await fs.promises.writeFile(filePath, image.toPNG());
    return { ok: true, path: filePath };
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
