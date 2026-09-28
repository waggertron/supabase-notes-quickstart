import { createClient } from '@supabase/supabase-js';

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
const auth = document.querySelector('#auth');
const workspace = document.querySelector('#workspace');
const add = document.querySelector('#add');
const notes = document.querySelector('#notes');
const status = document.querySelector('#status');
let user = null;
let loadVersion = 0;
let busy = false;

async function run(action) {
  if (busy) return;
  busy = true;
  status.textContent = 'Working...';
  document.querySelectorAll('button').forEach(b => { b.disabled = true; });
  try {
    status.textContent = (await action()) ?? '';
  } catch (error) {
    status.textContent = error.message ?? 'Request failed. Try again.';
  } finally {
    busy = false;
    document.querySelectorAll('button').forEach(b => { b.disabled = false; });
  }
}

function checkedBody(value) {
  const body = value.trim();
  if (!body || [...body].length > 2000) {
    throw new Error('Use between 1 and 2000 characters.');
  }
  return body;
}

async function loadNotes() {
  const version = ++loadVersion;
  if (!user) return;
  const { data, error } = await db.from('notes')
    .select('id, body, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(100);
  if (version !== loadVersion) return;
  if (error) throw error;
  notes.replaceChildren();
  for (const note of data) {
    const row = document.createElement('li');
    const input = document.createElement('textarea');
    input.value = note.body;
    input.maxLength = 2000;
    input.setAttribute('aria-label', 'Edit note');
    const save = document.createElement('button');
    save.textContent = 'Save';
    save.onclick = () => run(async () => {
      const { error } = await db.from('notes')
        .update({ body: checkedBody(input.value) }).eq('id', note.id)
        .select('id').single();
      if (error) throw error;
      await loadNotes();
      return 'Saved.';
    });
    const remove = document.createElement('button');
    remove.textContent = 'Delete';
    remove.onclick = () => run(async () => {
      const { error } = await db.from('notes').delete().eq('id', note.id)
        .select('id').single();
      if (error) throw error;
      await loadNotes();
      return 'Deleted.';
    });
    save.disabled = remove.disabled = busy;
    row.append(input, save, remove);
    notes.append(row);
  }
}

auth.onsubmit = event => {
  event.preventDefault();
  const fields = new FormData(auth);
  const credentials = {
    email: fields.get('email').trim(),
    password: fields.get('password'),
  };
  const signup = event.submitter?.value === 'signup';
  void run(async () => {
    const { data, error } = signup
      ? await db.auth.signUp(credentials)
      : await db.auth.signInWithPassword(credentials);
    if (error) throw error;
    auth.reset();
    return data.session ? 'Signed in.' : 'Confirm your email, then sign in.';
  });
};

add.onsubmit = event => {
  event.preventDefault();
  void run(async () => {
    const body = checkedBody(new FormData(add).get('body'));
    const { error } = await db.from('notes').insert({ body });
    if (error) throw error;
    add.reset();
    await loadNotes();
    return 'Added.';
  });
};

document.querySelector('#signout').onclick = () => run(async () => {
  const { error } = await db.auth.signOut({ scope: 'local' });
  if (error) throw error;
  return 'Signed out.';
});
document.querySelector('#refresh').onclick = () => run(loadNotes);

db.auth.onAuthStateChange((_event, session) => {
  user = session?.user ?? null;
  ++loadVersion;
  notes.replaceChildren();
  add.reset();
  auth.hidden = Boolean(user);
  workspace.hidden = !user;
  document.querySelector('#identity').textContent = user?.email ?? '';
  // Defer SDK calls until the synchronous auth callback has returned.
  setTimeout(() => {
    loadNotes().catch(error => { status.textContent = error.message; });
  }, 0);
});
