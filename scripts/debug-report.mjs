import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const root = process.cwd();
const reportsRoot = path.join(root, 'reports', 'debug', stamp);
const stepsRoot = path.join(reportsRoot, 'steps');
const artifactsRoot = path.join(reportsRoot, 'artifacts');

const args = new Set(process.argv.slice(2));
const skipE2E = args.has('--skip-e2e');

fs.mkdirSync(stepsRoot, { recursive: true });
fs.mkdirSync(artifactsRoot, { recursive: true });

const defaultSteps = [
  { id: 'lint', command: 'npm run lint' },
  { id: 'test-unit', command: 'npm run test:unit' },
  { id: 'test-backend', command: 'npm run test:backend' },
  ...(skipE2E ? [] : [{ id: 'test-e2e', command: 'npm run test:e2e' }]),
  { id: 'build', command: 'npm run build' },
];

function parseFailureHints(logText) {
  return logText
    .split('\n')
    .filter((line) => /error|failed|exception|fatal|traceback/i.test(line))
    .slice(-80);
}

function tailLines(logText, maxLines = 140) {
  const lines = logText.split('\n');
  return lines.slice(Math.max(0, lines.length - maxLines));
}

function run(commandToRun, options = {}) {
  const { streamOutput = true } = options;
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
      if (streamOutput) {
        process.stdout.write(text);
      }
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      if (streamOutput) {
        process.stderr.write(text);
      }
    });

    proc.on('close', (code) => {
      resolve({ code: code ?? 1, elapsedMs: Date.now() - start, output });
    });
  });
}

async function collectArtifacts() {
  const artifactResults = [];

  const inventoryCommands = [
    { id: 'npm-ls', command: 'npm ls --depth=0 --json' },
    { id: 'npm-outdated', command: 'npm outdated --json' },
  ];

  const venvPython = path.join(root, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) {
    inventoryCommands.push({ id: 'python-freeze', command: `${venvPython} -m pip freeze` });
  }

  for (const item of inventoryCommands) {
    const result = await run(item.command, { streamOutput: false });
    const filePath = path.join(artifactsRoot, `${item.id}.log`);
    fs.writeFileSync(filePath, result.output || '', 'utf8');

    artifactResults.push({
      id: item.id,
      command: item.command,
      exitCode: result.code,
      status: result.code === 0 ? 'success' : 'warning',
      path: path.relative(root, filePath),
    });
  }

  return artifactResults;
}

const startedAt = Date.now();
const stepResults = [];

for (const step of defaultSteps) {
  const result = await run(step.command);
  const logPath = path.join(stepsRoot, `${step.id}.log`);
  fs.writeFileSync(logPath, result.output, 'utf8');

  stepResults.push({
    id: step.id,
    command: step.command,
    status: result.code === 0 ? 'success' : 'failed',
    exitCode: result.code,
    elapsedMs: result.elapsedMs,
    logPath: path.relative(root, logPath),
    logTail: tailLines(result.output),
    failureHints: result.code === 0 ? [] : parseFailureHints(result.output),
  });

  if (result.code !== 0) {
    break;
  }
}

const artifactResults = await collectArtifacts();
const failedStep = stepResults.find((step) => step.status === 'failed');
const status = failedStep ? 'failed' : 'success';

const summary = {
  timestamp: now.toISOString(),
  status,
  elapsedMs: Date.now() - startedAt,
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  skipE2E,
  steps: stepResults,
  artifacts: artifactResults,
};

const summaryJsonPath = path.join(reportsRoot, 'summary.json');
fs.writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');

const summaryMdLines = [
  '# Debug Report',
  '',
  `- Timestamp: ${summary.timestamp}`,
  `- Status: **${summary.status.toUpperCase()}**`,
  `- Duration: ${summary.elapsedMs} ms`,
  `- Node: ${summary.nodeVersion}`,
  `- Platform: ${summary.platform}/${summary.arch}`,
  `- Host: ${summary.hostname}`,
  `- skipE2E: ${summary.skipE2E}`,
  '',
  '## Step Summary',
  '',
  '| Step | Status | Exit | Duration (ms) | Log |',
  '| --- | --- | ---: | ---: | --- |',
  ...summary.steps.map((step) => `| ${step.id} | ${step.status} | ${step.exitCode} | ${step.elapsedMs} | \`${step.logPath}\` |`),
  '',
  '## Library and Environment Checks',
  '',
  '| Artifact | Status | Exit | File |',
  '| --- | --- | ---: | --- |',
  ...summary.artifacts.map((artifact) => `| ${artifact.id} | ${artifact.status} | ${artifact.exitCode} | \`${artifact.path}\` |`),
  '',
  '## Failure Hints',
  '',
];

if (!failedStep) {
  summaryMdLines.push('- No failed build/test steps.');
} else if (failedStep.failureHints.length === 0) {
  summaryMdLines.push(`- Step \`${failedStep.id}\` failed but no explicit hints were detected.`);
} else {
  for (const line of failedStep.failureHints) {
    summaryMdLines.push(`- ${line}`);
  }
}

summaryMdLines.push('');
summaryMdLines.push('## Last Step Log Tail');
summaryMdLines.push('');
summaryMdLines.push('```text');

const tailSource = failedStep ? failedStep.logTail : (summary.steps.at(-1)?.logTail ?? []);
for (const line of tailSource) {
  summaryMdLines.push(line);
}

summaryMdLines.push('```');
summaryMdLines.push('');

const summaryMdPath = path.join(reportsRoot, 'summary.md');
fs.writeFileSync(summaryMdPath, summaryMdLines.join('\n'), 'utf8');

console.log('Debug report generated:');
console.log(`- ${path.relative(root, summaryJsonPath)}`);
console.log(`- ${path.relative(root, summaryMdPath)}`);
console.log(`- ${path.relative(root, artifactsRoot)}`);
console.log(`- ${path.relative(root, stepsRoot)}`);

process.exit(failedStep ? failedStep.exitCode : 0);
