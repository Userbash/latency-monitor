import fs from 'node:fs';
import path from 'node:path';
import { execaCommand } from 'execa';

const root = process.cwd();
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const reportRoot = path.join(root, 'reports', 'qa-pipeline', stamp);
fs.mkdirSync(reportRoot, { recursive: true });

const steps = [
  { id: 'prebuild', command: 'npm run test:prebuild' },
  { id: 'build', command: 'npm run build' },
  { id: 'postbuild', command: 'npm run test:postbuild' },
  { id: 'debug-report', command: 'npm run debug:report:quick' },
  { id: 'build-report', command: 'npm run build:report' },
];

const results = [];
for (const step of steps) {
  const started = Date.now();
  const result = await execaCommand(step.command, {
    cwd: root,
    shell: true,
    all: true,
    reject: false,
  });

  const output = result.all ?? '';
  const logPath = path.join(reportRoot, `${step.id}.log`);
  fs.writeFileSync(logPath, output, 'utf8');

  results.push({
    id: step.id,
    command: step.command,
    exitCode: result.exitCode ?? 1,
    elapsedMs: Date.now() - started,
    logPath: path.relative(root, logPath),
    status: (result.exitCode ?? 1) === 0 ? 'success' : 'failed',
  });

  process.stdout.write(output);

  if ((result.exitCode ?? 1) !== 0) {
    break;
  }
}

const summary = {
  timestamp: now.toISOString(),
  status: results.every((item) => item.status === 'success') ? 'success' : 'failed',
  steps: results,
};

const summaryPath = path.join(reportRoot, 'summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

console.log('QA pipeline report generated:');
console.log(`- ${path.relative(root, summaryPath)}`);

process.exit(summary.status === 'success' ? 0 : 1);
