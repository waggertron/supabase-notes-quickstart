import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localConfig } from '../../scripts/local-config.mjs';

export const config = localConfig();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
export const client = () => createClient(config.API_URL, config.PUBLISHABLE_KEY, options);
export const admin = createClient(config.API_URL, config.SECRET_KEY, options);

export function credentials(role) {
  return { email: `${role}-${randomUUID()}@example.com`, password: randomUUID() };
}

export async function createUser(role) {
  const auth = credentials(role);
  const { data, error } = await admin.auth.admin.createUser({ ...auth, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  const db = client();
  const login = await db.auth.signInWithPassword(auth);
  if (login.error) {
    await admin.auth.admin.deleteUser(id);
    throw login.error;
  }
  return { ...auth, id, db };
}

export async function deleteUser(id) {
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw error;
}
