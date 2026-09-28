import { test, expect } from '@playwright/test';
import { client, credentials, createUser, deleteUser } from './helpers/clients.mjs';

async function signIn(page, user) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#identity')).toHaveText(user.email);
}
async function addNote(page, body) {
  await page.getByLabel('New note').fill(body);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Added.');
}

test('sign-up, CRUD, session persistence, validation, and sign-out', async ({ page }) => {
  const auth = credentials('signup');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/');
    await page.getByLabel('Email', { exact: true }).fill(auth.email);
    await page.getByLabel('Password', { exact: true }).fill(auth.password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.locator('#identity')).toHaveText(auth.email);
    await addNote(page, 'Private <strong>literal markup</strong>');
    await expect(page.getByLabel('Edit note')).toHaveValue('Private <strong>literal markup</strong>');
    await expect(page.locator('#notes strong')).toHaveCount(0);
    await page.getByLabel('Edit note').fill('Edited note');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    await page.reload();
    await expect(page.getByLabel('Edit note')).toHaveValue('Edited note');
    await page.getByLabel('New note').fill('   ');
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Use between 1 and 2000 characters.');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.locator('#workspace')).toBeHidden();
    await expect(page.locator('#notes li')).toHaveCount(0);
    await signIn(page, auth);
    await expect(page.getByLabel('Edit note')).toHaveValue('Edited note');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Deleted.');
    await page.reload();
    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#notes li')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    const { data, error } = await client().auth.signInWithPassword(auth);
    if (data.user) await deleteUser(data.user.id);
    else if (error && error.code !== 'invalid_credentials') throw error;
  }
});

test('two browser accounts see only their own notes', async ({ browser }) => {
  const users = [];
  const contexts = [];
  try {
    const alice = await createUser('alice'); users.push(alice);
    const bob = await createUser('bob'); users.push(bob);
    const aContext = await browser.newContext(); contexts.push(aContext);
    const bContext = await browser.newContext(); contexts.push(bContext);
    const a = await aContext.newPage(), b = await bContext.newPage();
    await signIn(a, alice); await addNote(a, 'Alice private');
    await signIn(b, bob); await expect(b.locator('#notes li')).toHaveCount(0);
    await addNote(b, 'Bob private');
    await a.getByRole('button', { name: 'Refresh notes', exact: true }).click();
    await expect(a.getByLabel('Edit note')).toHaveValue('Alice private');
    await expect(b.getByLabel('Edit note')).toHaveValue('Bob private');
    await expect(a.locator('#notes li')).toHaveCount(1);
    await expect(b.locator('#notes li')).toHaveCount(1);
  } finally {
    for (const context of contexts) await context.close();
    for (const user of users) await deleteUser(user.id);
  }
});
