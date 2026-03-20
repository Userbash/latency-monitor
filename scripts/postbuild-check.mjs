import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const target = process.env.BUILD_TARGET || 'generic';

const reportRoot = path.join(root, 'reports', 'postbuild', stamp);
fs.mkdirSync(reportRoot, { recursive: true });

function assertPathExists(relativePath, message) {
  const absolutePath = path.join(root, relativePath);
  const ok = fs.existsSync(absolutePath);
  return {
    check: message,
    path: relativePath,
    ok,
  };
}

function globByExtension(dirPath, extension) {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith(extension.toLowerCase()))
    .map((name) => path.join(dirPath, name));
}

const checks = [
  assertPathExists('dist/index.html', 'Frontend build index exists'),
  assertPathExists('dist/assets', 'Frontend assets folder exists'),
  assertPathExists('dist-electron/main.js', 'Electron main bundle exists'),
];

if (target === 'appimage') {
  checks.push({
    check: 'Linux AppImage artifact exists',
    path: 'dist/*.AppImage',
    ok: globByExtension(path.join(root, 'dist'), '.AppImage').length > 0,
  });
}

if (target === 'windows') {
  checks.push({
    check: 'Windows executable artifact exists',
    path: 'dist/*.exe',
    ok: globByExtension(path.join(root, 'dist'), '.exe').length > 0,
  });
}

const failed = checks.filter((item) => !item.ok);
const summary = {
  timestamp: now.toISOString(),
  target,
  hostname: os.hostname(),
  platform: process.platform,
  checks,
  status: failed.length === 0 ? 'success' : 'failed',
};

const summaryJson = path.join(reportRoot, 'summary.json');
fs.writeFileSync(summaryJson, JSON.stringify(summary, null, 2), 'utf8');

const summaryMd = [
  '# Postbuild Check Report',
  '',
  `- Timestamp: ${summary.timestamp}`,
  `- Target: ${summary.target}`,
  `- Platform: ${summary.platform}`,
  `- Host: ${summary.hostname}`,
  `- Status: **${summary.status.toUpperCase()}**`,
  '',
  '| Check | Path | Result |',
  '| --- | --- | --- |',
  ...checks.map((item) => `| ${item.check} | \`${item.path}\` | ${item.ok ? 'OK' : 'FAIL'} |`),
  '',
].join('\n');

const summaryMdPath = path.join(reportRoot, 'summary.md');
fs.writeFileSync(summaryMdPath, summaryMd, 'utf8');

console.log('Postbuild report generated:');
console.log(`- ${path.relative(root, summaryJson)}`);
console.log(`- ${path.relative(root, summaryMdPath)}`);

if (failed.length > 0) {
  for (const item of failed) {
    console.error(`[postbuild-check] FAIL: ${item.check} (${item.path})`);
  }
  process.exit(1);
}
