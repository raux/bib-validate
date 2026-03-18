#!/usr/bin/env node
// Translate --grep <pattern> (Mocha-style) to vitest's -t <pattern>
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const transformed = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--grep' && i + 1 < args.length) {
    transformed.push('-t', args[++i]);
  } else {
    transformed.push(args[i]);
  }
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', ...transformed],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
