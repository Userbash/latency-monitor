import { useEffect, useMemo, useState } from 'react';
import { WindowControls } from './components/WindowControls';
import enLocale from './locales/en.json';
import ruLocale from './locales/ru.json';
import zhLocale from './locales/zh.json';
import czLocale from './locales/cz.json';

type Language = 'en' | 'ru' | 'zh' | 'cz';
type Mode = 'normal' | 'social';
type ServerSelection = 'auto' | string;

type Profile = {
  id: string;
  label: Partial<Record<Language, string>> & { en: string };
  targets: string[];
};

type SocialLink = {
  id: string;
  label: Partial<Record<Language, string>> & { en: string };
  url: string;
  icon?: string;
};

type NetworkMetrics = {
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
};

type ProgressPayload = {
  stage: 'probing-targets' | 'running-samples' | 'computing-results';
  progress: number;
  host: string;
  currentMetrics: {
    ping: number;
    jitter: number;
    packetLoss: number;
  };
};

const TEST_SAMPLE_COUNT = 12;
const TARGET_POOL_LIMIT = 8;

const profiles: Profile[] = [
  {
    id: 'cs2',
    label: { en: 'CS2', ru: 'CS2', zh: 'CS2' },
    targets: ['api.steampowered.com', 'steamcommunity.com', 'store.steampowered.com', '1.1.1.1', '8.8.8.8'],
  },
  {
    id: 'valorant',
    label: { en: 'Valorant', ru: 'Valorant', zh: 'Valorant' },
    targets: ['auth.riotgames.com', 'status.riotgames.com', 'leagueoflegends.com', '1.0.0.1', '9.9.9.9'],
  },
  {
    id: 'dota2',
    label: { en: 'Dota 2', ru: 'Dota 2', zh: 'Dota 2' },
    targets: ['dota2.com', 'api.steampowered.com', 'steamcommunity.com', '8.8.4.4', '208.67.222.222'],
  },
  {
    id: 'lol',
    label: { en: 'League of Legends', ru: 'League of Legends', zh: 'League of Legends' },
    targets: ['auth.riotgames.com', 'status.riotgames.com', 'leagueoflegends.com', '1.1.1.1', '149.112.112.112'],
  },
  {
    id: 'apex',
    label: { en: 'Apex Legends', ru: 'Apex Legends', zh: 'Apex Legends' },
    targets: ['www.ea.com', 'api.steampowered.com', 'help.ea.com', '8.8.8.8', '9.9.9.9'],
  },
  {
    id: 'fortnite',
    label: { en: 'Fortnite', ru: 'Fortnite', zh: 'Fortnite' },
    targets: ['fortnite.com', 'www.epicgames.com', 'status.epicgames.com', '1.0.0.1', '208.67.220.220'],
  },
  {
    id: 'pubg',
    label: { en: 'PUBG: Battlegrounds', ru: 'PUBG: Battlegrounds', zh: 'PUBG: Battlegrounds' },
    targets: ['pubg.com', 'steamcommunity.com', 'api.steampowered.com', '9.9.9.9', '8.8.4.4'],
  },
  {
    id: 'rocket-league',
    label: { en: 'Rocket League', ru: 'Rocket League', zh: 'Rocket League' },
    targets: ['www.rocketleague.com', 'www.epicgames.com', 'status.epicgames.com', '1.1.1.1', '8.8.8.8'],
  },
  {
    id: 'rust',
    label: { en: 'Rust', ru: 'Rust', zh: 'Rust' },
    targets: ['rust.facepunch.com', 'playrust.com', 'api.steampowered.com', 'steamcommunity.com', '9.9.9.9'],
  },
];

const globalServerPool = [
  'api.steampowered.com',
  'steamcommunity.com',
  'auth.riotgames.com',
  'status.riotgames.com',
  'status.epicgames.com',
  'rust.facepunch.com',
  'pubg.com',
  'leagueoflegends.com',
  '1.1.1.1',
  '1.0.0.1',
  '8.8.8.8',
  '8.8.4.4',
  '9.9.9.9',
  '149.112.112.112',
  '208.67.222.222',
  '208.67.220.220',
  '94.140.14.14',
  '94.140.15.15',
];

const socialLinks: SocialLink[] = [
  {
    id: 'youtube',
    label: { en: 'YouTube', ru: 'YouTube', zh: 'YouTube' },
    url: 'https://www.youtube.com/',
    icon: 'YT',
  },
  {
    id: 'twitch',
    label: { en: 'Twitch', ru: 'Twitch', zh: 'Twitch' },
    url: 'https://www.twitch.tv/',
    icon: 'TW',
  },
  {
    id: 'discord',
    label: { en: 'Discord', ru: 'Discord', zh: 'Discord' },
    url: 'https://discord.com/',
    icon: 'DC',
  },
  {
    id: 'x',
    label: { en: 'X', ru: 'X', zh: 'X' },
    url: 'https://x.com/',
    icon: 'X',
  },
];

const topContactLinks: SocialLink[] = [
  {
    id: 'telegram',
    label: { en: 'Telegram', ru: 'Telegram', zh: 'Telegram' },
    url: 'https://t.me/',
    icon: 'TG',
  },
  {
    id: 'discord-top',
    label: { en: 'Discord', ru: 'Discord', zh: 'Discord' },
    url: 'https://discord.com/',
    icon: 'DC',
  },
  {
    id: 'youtube-top',
    label: { en: 'YouTube', ru: 'YouTube', zh: 'YouTube' },
    url: 'https://www.youtube.com/',
    icon: 'YT',
  },
  {
    id: 'x-top',
    label: { en: 'X', ru: 'X', zh: 'X' },
    url: 'https://x.com/',
    icon: 'X',
  },
];

const i18n = {
  en: enLocale,
  ru: ruLocale,
  zh: zhLocale,
  cz: czLocale,
} as const;

function mapLocaleToLanguage(rawLocale: string | null | undefined): Language {
  const locale = (rawLocale ?? '').toLowerCase();
  if (locale.startsWith('ru')) return 'ru';
  if (locale.startsWith('zh') || locale.startsWith('ch')) return 'zh';
  if (locale.startsWith('cs') || locale.startsWith('cz')) return 'cz';
  return 'en';
}

function getLocalizedText(label: Partial<Record<Language, string>> & { en: string }, language: Language): string {
  return label[language] ?? label.en;
}

function shuffleArray<T>(input: T[]): T[] {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRotatedTargets(
  selectedServer: ServerSelection,
  availableServers: string[],
  lastTestedHost: string | null
): string[] {
  const baseTargets = selectedServer === 'auto'
    ? availableServers
    : [selectedServer, ...availableServers.filter((item) => item !== selectedServer)];

  const withoutPrevious = lastTestedHost && baseTargets.length > 1
    ? baseTargets.filter((item) => item !== lastTestedHost)
    : baseTargets;

  const source = withoutPrevious.length > 0 ? withoutPrevious : baseTargets;
  return shuffleArray(source).slice(0, TARGET_POOL_LIMIT);
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeProgressPayload(data: ProgressPayload): ProgressPayload {
  const host = data.host.trim();
  return {
    ...data,
    progress: clampProgress(data.progress),
    host: host || 'unknown-host',
    currentMetrics: {
      ping: Number.isFinite(data.currentMetrics.ping) ? data.currentMetrics.ping : 0,
      jitter: Number.isFinite(data.currentMetrics.jitter) ? data.currentMetrics.jitter : 0,
      packetLoss: Number.isFinite(data.currentMetrics.packetLoss) ? data.currentMetrics.packetLoss : 0,
    },
  };
}

function ensureSelectedServer(selectedServer: ServerSelection, availableServers: string[]): ServerSelection {
  if (selectedServer === 'auto') return 'auto';
  // Fallback to auto when profile switch removes the previously selected host.
  return availableServers.includes(selectedServer) ? selectedServer : 'auto';
}

function isNetworkMetricsPayload(input: unknown): input is { results: NetworkMetrics } {
  if (!input || typeof input !== 'object') return false;
  const payload = input as { results?: Partial<NetworkMetrics> };
  return Boolean(payload.results && typeof payload.results.testedHost === 'string');
}

const metricOrder: Array<keyof Pick<NetworkMetrics, 'ping' | 'jitter' | 'packetLoss' | 'p95' | 'spikeRate' | 'bufferbloat' | 'score'>> = [
  'ping',
  'jitter',
  'packetLoss',
  'p95',
  'spikeRate',
  'bufferbloat',
  'score',
];

function detectLanguage(): Language {
  return mapLocaleToLanguage(navigator.language);
}

function getStatusClass(status: NetworkMetrics['status'] | null): string {
  if (status === 'Excellent') return 'status-pill status-excellent';
  if (status === 'Good') return 'status-pill status-good';
  if (status === 'Fair') return 'status-pill status-fair';
  if (status === 'Poor') return 'status-pill status-poor';
  return 'status-pill';
}

function App() {
  const isElectron = Boolean(window.electronAPI) || /Electron/i.test(navigator.userAgent);
  const [language, setLanguage] = useState<Language>('en');
  const [nightMode, setNightMode] = useState(false);
  const [mode, setMode] = useState<Mode>('normal');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0].id);
  const [selectedServer, setSelectedServer] = useState<ServerSelection>('auto');

  const [statusText, setStatusText] = useState<string>('Idle');
  const [progress, setProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<ProgressPayload['stage']>('probing-targets');
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [errorText, setErrorText] = useState<string>('');
  const [infoText, setInfoText] = useState<string>('');
  const [lastTestedHost, setLastTestedHost] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const t = useMemo(() => i18n[language], [language]);
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0],
    [selectedProfileId]
  );

  const availableServers = useMemo(
    () => Array.from(new Set([...selectedProfile.targets, ...globalServerPool])),
    [selectedProfile.targets]
  );

  useEffect(() => {
    // Keep selected server valid when profile/server pools change.
    setSelectedServer((prev) => ensureSelectedServer(prev, availableServers));
  }, [availableServers]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'orange');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-night', nightMode ? 'on' : 'off');
  }, [nightMode]);

  useEffect(() => {
    let canceled = false;

    const applySystemLanguage = async () => {
      const fallbackLanguage = detectLanguage();
      if (!window.electronAPI?.getSystemLocale) {
        setLanguage(fallbackLanguage);
        return;
      }

      try {
        const systemLocale = await window.electronAPI.getSystemLocale();
        if (!canceled) {
          setLanguage(mapLocaleToLanguage(systemLocale));
        }
      } catch {
        if (!canceled) {
          setLanguage(fallbackLanguage);
        }
      }
    };

    void applySystemLanguage();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    const removeProgress = window.electronAPI?.onTestProgress((data) => {
      const safeData = sanitizeProgressPayload(data);
      setStatusText(t.running);
      setProgress(safeData.progress);
      setProgressStage(safeData.stage);
      setLastTestedHost(safeData.host);
      setMetrics((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ping: Number(safeData.currentMetrics.ping.toFixed(1)),
          jitter: Number(safeData.currentMetrics.jitter.toFixed(1)),
          packetLoss: Number(safeData.currentMetrics.packetLoss.toFixed(1)),
          testedHost: safeData.host,
        };
      });
    });

    const removeComplete = window.electronAPI?.onTestComplete((results) => {
      setStatusText(t.finished);
      setProgress(100);
      setMetrics(results);
      setLastTestedHost(results.testedHost);
      setIsRunning(false);
    });

    const removeError = window.electronAPI?.onTestError((message) => {
      setErrorText(message);
      setStatusText('Error');
      setIsRunning(false);
    });

    return () => {
      removeProgress?.();
      removeComplete?.();
      removeError?.();
    };
  }, [t.finished, t.running]);

  const startTest = async () => {
    if (isRunning) {
      return;
    }

    setErrorText('');
    setInfoText('');
    setStatusText(t.running);
    setProgress(0);
    setMetrics(null);
    setIsRunning(true);

    const rotatedTargets = buildRotatedTargets(selectedServer, availableServers, lastTestedHost);

    if (window.electronAPI) {
      // Desktop mode uses IPC to stream progress updates from Electron main process.
      window.electronAPI.startNetworkTest({ targets: rotatedTargets, samples: TEST_SAMPLE_COUNT });
      return;
    }

    try {
      // Browser/API mode performs a single request and receives final aggregated metrics.
      const response = await fetch('/api/start-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: rotatedTargets[0] || availableServers[0],
          targets: rotatedTargets,
          samples: TEST_SAMPLE_COUNT,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!isNetworkMetricsPayload(data)) {
        throw new Error('Unexpected API response payload.');
      }

      setMetrics(data.results);
      setProgress(100);
      setStatusText(t.finished);
      setLastTestedHost(data.results.testedHost);
    } catch {
      setErrorText(t.errors.backend);
      setStatusText('Error');
    } finally {
      setIsRunning(false);
    }
  };

  const openSocial = async (url: string) => {
    if (!window.electronAPI) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const result = await window.electronAPI.openExternal(url);
    if (!result.ok) {
      setErrorText(result.error || t.errors.externalLink);
    }
  };

  const takeScreenshot = async () => {
    setErrorText('');
    setInfoText('');

    if (!window.electronAPI?.captureScreenshot) {
      setErrorText(t.errors.screenshotUnavailable);
      return;
    }

    const result = await window.electronAPI.captureScreenshot();
    if (!result.ok) {
      if ((result.error || '').toLowerCase().includes('canceled')) {
        setInfoText(t.errors.screenshotCanceled);
        return;
      }

      setErrorText(result.error || t.errors.screenshot);
      return;
    }

    setInfoText(result.path ? `${t.screenshotSaved}: ${result.path}` : t.screenshotSaved);
  };

  return (
    <div className={`app-shell ${nightMode ? 'night-mode' : ''}`}>
      {isElectron ? (
        <header className="app-topbar">
          <div className="topbar-left no-drag">
            <div className="signal-row">
              <span className="signal-dot signal-dot-active" />
              <span className="signal-dot" />
            </div>
          </div>

          <div className="topbar-center">{t.topLabel}</div>

          <div className="topbar-right no-drag">
            <div className="topbar-contacts">
              {topContactLinks.map((link) => (
                <button
                  key={link.id}
                  className="contact-chip"
                  onClick={() => openSocial(link.url)}
                  title={getLocalizedText(link.label, language)}
                >
                  {link.icon}
                </button>
              ))}
            </div>

            <button
              onClick={() => setNightMode((prev) => !prev)}
              className={`topbar-action-btn ${nightMode ? 'active' : ''}`}
            >
              {t.nightMode}
            </button>

            <button onClick={takeScreenshot} className="topbar-action-btn">
              {t.screenshot}
            </button>

            <WindowControls />
          </div>
        </header>
      ) : null}

      <main className="layout-grid" data-mode={mode}>
        <section className="panel panel-main">
          <header className="panel-header">
            <h1>{t.appTitle}</h1>
            <p>{t.runHint}</p>
          </header>

          <div className="control-row">
            <label>
              {t.server}
              <select value={selectedServer} onChange={(e) => setSelectedServer(e.target.value)}>
                <option value="auto">{t.serverAuto}</option>
                {availableServers.map((server) => (
                  <option key={server} value={server}>{server}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="status-row">
            <span>{statusText}</span>
            <span>{t.stage}: {t.stageMap[progressStage]}</span>
          </div>

          <div className="progress-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div className="action-row">
            <button data-testid="start-test-btn" onClick={startTest} className="start-btn no-drag" disabled={isRunning}>
              {isRunning ? t.running : t.startTest}
            </button>
          </div>

          {errorText ? <p className="error-text">{errorText}</p> : null}
          {infoText ? <p className="info-text">{infoText}</p> : null}

          <div className="quality-row">
            <div>
              <h2>{t.quality}</h2>
              <span className={getStatusClass(metrics?.status ?? null)}>{metrics?.status ?? '-'}</span>
            </div>
            <div>
              <h2>{t.testedHost}</h2>
              <span>{metrics?.testedHost ?? selectedProfile.targets[0]}</span>
            </div>
          </div>

          <div className="metrics-grid">
            {metricOrder.map((metricName) => {
              const value = metrics?.[metricName] ?? 0;
              const isPercent = metricName === 'packetLoss' || metricName === 'spikeRate';
              const unit = metricName === 'score' ? '' : isPercent ? t.units.percent : t.units.ms;

              return (
                <article className="metric-card" key={metricName} title={t.tooltips[metricName]}>
                  <h3>{t.metrics[metricName]}</h3>
                  <p>
                    {value}
                    {unit ? ` ${unit}` : ''}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="recommendation">
            <h2>{t.recommendation}</h2>
            <p>{metrics?.recommendation ?? '-'}</p>
          </div>
        </section>

        <aside className="panel panel-side no-drag">
          <h2>{t.mode}</h2>
          <div className="mode-toggle">
            <button onClick={() => setMode('normal')} className={mode === 'normal' ? 'active' : ''}>
              {t.normalMode}
            </button>
            <button onClick={() => setMode('social')} className={mode === 'social' ? 'active' : ''}>
              {t.socialMode}
            </button>
          </div>

          {mode === 'normal' ? (
            <>
              <h3>{t.profile}</h3>
              <div className="list-group">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      setSelectedProfileId(profile.id);
                      setSelectedServer('auto');
                    }}
                    className={selectedProfile.id === profile.id ? 'active' : ''}
                  >
                    {getLocalizedText(profile.label, language)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>{t.socialMode}</h3>
              <div className="list-group">
                {socialLinks.map((item) => (
                  <button key={item.id} onClick={() => openSocial(item.url)}>
                    {getLocalizedText(item.label, language)}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
