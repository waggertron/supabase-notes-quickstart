import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));

export function localConfig() {
  let config;
  try {
    const output = execFileSync('npx', ['--no-install', 'supabase', 'status', '--output', 'json'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    config = JSON.parse(output);
  } catch {
    throw new Error('Local Supabase is unavailable. Start Docker, then run npm run setup.');
  }
  const url = new URL(config.API_URL);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('This helper only accepts the local Supabase HTTP endpoint.');
  }
  if (!config.PUBLISHABLE_KEY || !config.SECRET_KEY) {
    throw new Error('The pinned CLI did not return the expected local keys.');
  }
  return config;
}
