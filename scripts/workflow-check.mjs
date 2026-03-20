import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');

if (!fs.existsSync(workflowDir)) {
  console.error('Workflow directory not found: .github/workflows');
  process.exit(1);
}

const files = fs.readdirSync(workflowDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
if (files.length === 0) {
  console.error('No workflow files found in .github/workflows');
  process.exit(1);
}

let hasError = false;

function stepUsesAction(step, actionPrefix) {
  return typeof step?.uses === 'string' && step.uses.toLowerCase().startsWith(actionPrefix.toLowerCase());
}

function stepRunsNpm(step) {
  return typeof step?.run === 'string' && /\bnpm\s+run\b/.test(step.run);
}

function stepInstallsNodeDeps(step) {
  return typeof step?.run === 'string' && /\bnpm\s+ci\b|\bnpm\s+install\b/.test(step.run);
}

for (const fileName of files) {
  const filePath = path.join(workflowDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    const doc = YAML.parse(raw);

    if (!doc || typeof doc !== 'object') {
      console.error(`[workflow-check] ${fileName}: YAML root must be an object.`);
      hasError = true;
      continue;
    }

    if (!doc.name || typeof doc.name !== 'string') {
      console.error(`[workflow-check] ${fileName}: missing or invalid top-level 'name'.`);
      hasError = true;
    }

    if (!doc.on) {
      console.error(`[workflow-check] ${fileName}: missing top-level 'on' trigger configuration.`);
      hasError = true;
    }

    if (!doc.jobs || typeof doc.jobs !== 'object' || Object.keys(doc.jobs).length === 0) {
      console.error(`[workflow-check] ${fileName}: missing or empty 'jobs' block.`);
      hasError = true;
      continue;
    }

    for (const [jobName, jobConfig] of Object.entries(doc.jobs)) {
      const steps = Array.isArray(jobConfig?.steps) ? jobConfig.steps : [];

      let hasSetupNode = false;
      let hasNodeDeps = false;

      for (const step of steps) {
        if (stepUsesAction(step, 'actions/setup-node@')) {
          hasSetupNode = true;
          continue;
        }

        if (stepInstallsNodeDeps(step)) {
          hasNodeDeps = true;
          continue;
        }

        if (stepRunsNpm(step)) {
          if (!hasSetupNode) {
            console.error(
              `[workflow-check] ${fileName} job '${jobName}': npm step '${step.name || 'unnamed'}' runs before actions/setup-node.`
            );
            hasError = true;
          }

          if (!hasNodeDeps) {
            console.error(
              `[workflow-check] ${fileName} job '${jobName}': npm step '${step.name || 'unnamed'}' runs before npm dependencies installation (npm ci/npm install).`
            );
            hasError = true;
          }
        }
      }
    }
  } catch (error) {
    console.error(`[workflow-check] ${fileName}: YAML parse error.`);
    console.error(String(error));
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`[workflow-check] OK (${files.length} workflow file(s))`);
