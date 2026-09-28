import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { localConfig, root } from './local-config.mjs';

const config = localConfig();
try {
  writeFileSync(join(root, '.env.local'),
    `VITE_SUPABASE_URL=${config.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${config.PUBLISHABLE_KEY}\n`,
    { flag: 'wx', mode: 0o600 });
  console.log('Created .env.local with the local URL and publishable key. Run npm run dev.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Kept your existing .env.local. Run npm run dev, or see the README to refresh local settings.');
}
