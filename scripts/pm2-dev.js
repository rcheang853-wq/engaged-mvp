// PM2 wrapper to run Next.js dev server reliably on Windows.
// Usage: pm2 start scripts/pm2-dev.js --name engaged-next-dev

const { spawn } = require('child_process');

const host = process.env.NEXT_HOSTNAME || '0.0.0.0';
const port = process.env.NEXT_PORT || '3000';

// On Windows, using `shell: true` avoids spawn EINVAL edge-cases with npm.cmd under PM2.
const cmd = 'npm';
const args = ['run', 'dev', '--', '--hostname', host, '--port', String(port)];

console.log(`[pm2-dev] starting: ${cmd} ${args.join(' ')}`);

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
  },
});

child.on('exit', (code, signal) => {
  console.log(`[pm2-dev] exited code=${code} signal=${signal}`);
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
