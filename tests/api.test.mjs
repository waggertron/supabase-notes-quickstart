import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { client, createUser, deleteUser } from './helpers/clients.mjs';

let alice, bob;
const users = [];
before(async () => {
  alice = await createUser('alice'); users.push(alice.id);
  bob = await createUser('bob'); users.push(bob.id);
});
after(async () => {
  for (const id of users) await deleteUser(id);
});

async function insert(db, body) {
  const { data, error } = await db.from('notes').insert({ body }).select('*').single();
  assert.ifError(error);
  return data;
}

test('owner can create, read, edit, and delete a note', async () => {
  const note = await insert(alice.db, 'Original');
  assert.equal(note.user_id, alice.id);
  let result = await alice.db.from('notes').update({ body: 'Edited' })
    .eq('id', note.id).select().single();
  assert.ifError(result.error); assert.equal(result.data.body, 'Edited');
  result = await alice.db.from('notes').delete().eq('id', note.id).select().single();
  assert.ifError(result.error); assert.equal(result.data.id, note.id);
  result = await alice.db.from('notes').select().eq('id', note.id);
  assert.ifError(result.error); assert.deepEqual(result.data, []);
});

test('another user cannot read, update, or delete an owner note through the API', async () => {
  const note = await insert(alice.db, 'Private');
  for (const query of [
    bob.db.from('notes').select().eq('id', note.id),
    bob.db.from('notes').update({ body: 'Changed' }).eq('id', note.id).select(),
    bob.db.from('notes').delete().eq('id', note.id).select(),
  ]) {
    const result = await query;
    assert.ifError(result.error); assert.deepEqual(result.data, []);
  }
  const result = await alice.db.from('notes').select().eq('id', note.id).single();
  assert.ifError(result.error); assert.equal(result.data.body, 'Private');
});

test('column permissions reject ownership forgery and protected field updates', async () => {
  let result = await bob.db.from('notes').insert({ body: 'Forged', user_id: alice.id });
  assert.equal(result.error?.code, '42501');
  const note = await insert(bob.db, 'Owned by Bob');
  for (const patch of [{ user_id: alice.id }, { id: alice.id }, { created_at: '2026-01-01T00:00:00Z' }]) {
    result = await bob.db.from('notes').update(patch).eq('id', note.id);
    assert.equal(result.error?.code, '42501');
  }
});

test('database constraints reject invalid bodies and accept boundary lengths', async () => {
  for (const body of ['', '   ', 'x'.repeat(2001), null]) {
    const result = await alice.db.from('notes').insert({ body });
    assert.equal(result.error?.code, body === null ? '23502' : '23514');
  }
  for (const body of ['x', 'x'.repeat(2000)]) {
    const note = await insert(alice.db, body);
    assert.equal(note.body, body);
  }
});

test('requests without a user session cannot read or create notes', async () => {
  const anonymous = client();
  for (const query of [anonymous.from('notes').select(), anonymous.from('notes').insert({ body: 'No session' })]) {
    const result = await query;
    assert.equal(result.error?.code, '42501');
  }
});
