import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const root = process.cwd();
const reportsRoot = path.join(root, 'reports', 'build', stamp);

const defaultCommand = 'npm run build';
const args = process.argv.slice(2);
const commandArgIndex = args.findIndex((item) => item === '--command');
const command = commandArgIndex >= 0 && args[commandArgIndex + 1] ? args[commandArgIndex + 1] : defaultCommand;

fs.mkdirSync(reportsRoot, { recursive: true });

function parseFailureHints(logText) {
  return logText
    .split('\n')
    .filter((line) => /error|failed|exception|fatal/i.test(line))
    .slice(-40);
}

function tailLines(logText, maxLines = 120) {
  const lines = logText.split('\n');
  return lines.slice(Math.max(0, lines.length - maxLines));
}

function run(commandToRun) {
  return new Promise((resolve) => {
    const start = Date.now();
    let output = '';

    const proc = spawn(commandToRun, {
      cwd: root,
      shell: true,
      env: process.env,
    });

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    proc.on('close', (code) => {
      const elapsedMs = Date.now() - start;
      resolve({ code: code ?? 1, elapsedMs, output });
    });
  });
}

const result = await run(command);
const status = result.code === 0 ? 'success' : 'failed';

const rawLogPath = path.join(reportsRoot, 'build.log');
fs.writeFileSync(rawLogPath, result.output, 'utf8');

const summary = {
  timestamp: now.toISOString(),
  command,
  status,
  exitCode: result.code,
  elapsedMs: result.elapsedMs,
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  logPath: path.relative(root, rawLogPath),
  logTail: tailLines(result.output),
  failureHints: result.code === 0 ? [] : parseFailureHints(result.output),
};

const summaryJsonPath = path.join(reportsRoot, 'summary.json');
fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');

const summaryMdPath = path.join(reportsRoot, 'summary.md');
const summaryMd = [
  '# Build Report',
  '',
  `- Timestamp: ${summary.timestamp}`,
  `- Command: \`${summary.command}\``,
  `- Status: **${summary.status.toUpperCase()}**`,
  `- Exit code: ${summary.exitCode}`,
  `- Duration: ${summary.elapsedMs} ms`,
  `- Node: ${summary.nodeVersion}`,
  `- Platform: ${summary.platform}/${summary.arch}`,
  `- Host: ${summary.hostname}`,
  `- Raw log: \`${summary.logPath}\``,
  '',
  '## Failure Hints',
  '',
  summary.failureHints.length > 0 ? summary.failureHints.map((line) => `- ${line}`).join('\n') : '- No failure hints detected.',
  '',
  '## Log Tail',
  '',
  '```text',
  ...summary.logTail,
  '```',
  '',
].join('\n');

fs.writeFileSync(summaryMdPath, summaryMd, 'utf8');

console.log('Build report generated:');
console.log(`- ${path.relative(root, rawLogPath)}`);
console.log(`- ${path.relative(root, summaryJsonPath)}`);
console.log(`- ${path.relative(root, summaryMdPath)}`);

process.exit(result.code);
