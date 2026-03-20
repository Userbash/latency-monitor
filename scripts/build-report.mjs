import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execaCommand } from 'execa';

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

function parseWarningHints(logText) {
  return logText
    .split('\n')
    .filter((line) => /warning|deprecated/i.test(line))
    .slice(-80);
}

function countMatches(logText, pattern) {
  const matches = logText.match(pattern);
  return matches ? matches.length : 0;
}

function countErrorLikeLines(logText) {
  return logText
    .split('\n')
    .filter((line) => /error|failed|exception|fatal/i.test(line))
    .filter((line) => !/\b0\s+failed\b/i.test(line))
    .length;
}

function tailLines(logText, maxLines = 120) {
  const lines = logText.split('\n');
  return lines.slice(Math.max(0, lines.length - maxLines));
}

async function run(commandToRun) {
  const start = Date.now();

  try {
    const result = await execaCommand(commandToRun, {
      cwd: root,
      shell: true,
      env: process.env,
      all: true,
      reject: false,
    });

    const output = result.all ?? '';
    process.stdout.write(output);

    return {
      code: result.exitCode ?? 1,
      elapsedMs: Date.now() - start,
      output,
    };
  } catch (error) {
    const output = String(error);
    process.stderr.write(output);
    return {
      code: 1,
      elapsedMs: Date.now() - start,
      output,
    };
  }
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
  warningCount: countMatches(result.output, /warning|deprecated/gi),
  errorCount: countErrorLikeLines(result.output),
  logPath: path.relative(root, rawLogPath),
  logTail: tailLines(result.output),
  warningHints: parseWarningHints(result.output),
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
  `- Warning count: ${summary.warningCount}`,
  `- Error-like count: ${summary.errorCount}`,
  `- Raw log: \`${summary.logPath}\``,
  '',
  '## Warning Hints',
  '',
  summary.warningHints.length > 0 ? summary.warningHints.map((line) => `- ${line}`).join('\n') : '- No warning hints detected.',
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
