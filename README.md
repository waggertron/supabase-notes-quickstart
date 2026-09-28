# Supabase private notes quick start

A complete notes app built with vanilla JavaScript, Vite, Supabase Auth, and PostgreSQL. Create an account, sign in, and create, edit, or delete private notes. Database policies enforce ownership even when a request bypasses the browser UI.

Companion to [Supabase: a Postgres backend, with a working quick start](https://waggertron.github.io/tech-learning/posts/2026-09-28-supabase-postgres-backend-quickstart/).

Everything runs locally. You do not need a Supabase account, a hosted project, or cloud credentials.

## Requirements

- **Node.js**: Version 22.12 or newer. Node 22 LTS is used in CI, and `.nvmrc` selects that major version if you use nvm.
- **npm and Git**: npm ships with Node. Git is used to clone this repository.
- **Docker**: Docker Desktop or a running Docker-compatible engine. The first start downloads several images, so allow several GB of free disk space and time for the download.
- **Shell**: macOS, Linux, or a Windows WSL2 shell with Docker integration enabled. Run Node, npm, and Git inside that shell.
- **For browser tests**: `curl` and the Playwright Chromium installation described below. Normal app use does not require Playwright's browser download.

Check your tools before starting:

```bash
node --version
npm --version
git --version
docker info
```

If `docker info` cannot connect, start your container engine first.

## Run from a fresh checkout

```bash
git clone https://github.com/waggertron/supabase-notes-quickstart.git
cd supabase-notes-quickstart
npm ci
npm run setup
npm run dev
```

Open **http://127.0.0.1:5173**. Keep `npm run dev` running while using the app.

`npm run setup` performs three steps:

1. Starts the local Supabase services using the committed `supabase/config.toml`.
2. Applies the committed notes migration to the local database. A fresh start may already have applied it, in which case there is nothing new to apply.
3. Creates `.env.local` using the local API URL and publishable key reported by the CLI. It leaves an existing `.env.local` unchanged and never writes a secret key into browser configuration.

The configuration and migration are already included. Do not run `supabase init` or create another notes migration.

Local email confirmation is disabled, so sign-up returns a session without sending mail. The local minimum password length is eight characters. This is a tutorial configuration, not a hosted Auth configuration.

### Try the app

1. Enter `alice@example.com` and a password of at least eight characters, then click **Create account**. You should see Alice's email and the notes area.
2. Add a note. Change its text and click **Save**. Reload the page to confirm the edit and signed-in session persist.
3. Click **Sign out**. The notes area disappears. Sign back in to restore Alice's notes.
4. Open a private browser window and create `bob@example.com`. Bob should see an empty list. Add a note as Bob and confirm Alice still sees only her own notes.
5. Delete a note and reload. It should stay deleted. A note containing only spaces should produce a validation message.

Use `127.0.0.1` consistently. Switching between `localhost` and `127.0.0.1` changes the browser origin and its stored session.

### Local service URLs

| Service | Default URL | Purpose |
| --- | --- | --- |
| Notes app | http://127.0.0.1:5173 | The application |
| Supabase API | http://127.0.0.1:54321 | Auth and generated data APIs |
| Supabase Studio | http://127.0.0.1:54323 | Inspect the local database and users |
| Local mail viewer | http://127.0.0.1:54324 | Inspect mail if you enable local email flows |

`npx supabase status` shows the actual addresses. Studio uses administrative access, so seeing all notes there is expected. It does not demonstrate what an ordinary application user can access.

## Environment variables

The setup helper creates this file automatically. For manual configuration, copy `.env.example` to `.env.local` and replace the placeholder using the **Publishable** key from `npx supabase status`:

```text
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_LOCAL_PUBLISHABLE_KEY_HERE
```

Vite exposes `VITE_` values in the browser bundle. A publishable key is intended for client use. A Supabase secret key or legacy `service_role` key bypasses database row policies and does not belong here. `.env.local` is ignored by Git.

If local settings change, stop Vite, move your old `.env.local` aside, and rerun `npm run setup` to generate a fresh file. Restart Vite afterward. The helper preserves an existing file so that rerunning setup does not silently overwrite settings you supplied.

## Test the app

Start the local services first with `npm run setup`. Install Playwright's browser once:

```bash
npx playwright install chromium
npm test
```

On Linux machines missing browser system libraries, use `npx playwright install --with-deps chromium` instead. Installing those OS packages may require administrator access.

`npm test` runs five API tests and two browser tests against the real local Supabase stack:

- Owner CRUD, database constraints, and valid length boundaries.
- Cross-account read, update, and delete attempts.
- Forged ownership and writes to protected columns.
- Requests made without a signed-in user.
- Browser sign-up, editing, persistence after reload, sign-out, and sign-in.
- Literal display of note text, whitespace validation, and two isolated browser accounts.

The tests obtain settings from the local CLI, reject nonlocal API URLs, create unique test accounts, and delete those accounts and their notes during teardown. They do not use a hosted project or your `.env.local` credentials. If you forcibly terminate the test process, teardown may not run. A disposable database reset removes any leftover test accounts along with all other local data.

The browser suite starts and stops its own Vite process on **127.0.0.1:5174**, so the normal app can keep running on port 5173. It checks HTTP and the served JavaScript before launching Chromium. Port 5174 must be free.

Run either suite separately:

```bash
npm run test:api
npm run test:browser
```

GitHub Actions runs the same local setup, production build, API tests, and browser tests on pushes to `main` and pull requests.

## Build and preview

```bash
npm run build
npm run preview
```

Open **http://127.0.0.1:4173** to inspect the production frontend. Supabase must still be running for sign-in and database requests. Stop the preview with Ctrl-C.

The build output is `dist/`. The current Vite environment is embedded at build time. A build using the local API URL is useful for local preview, not a public deployment whose visitors need a reachable backend.

## Stop, restart, or reset

Stop the frontend with Ctrl-C, then stop this project's backend:

```bash
npm run stop
```

This preserves local database state. To resume later:

```bash
npm run setup
npm run dev
```

To discard **all accounts and notes in this local tutorial database**, stop the app and run:

```bash
npm run clean:database
npm run setup
```

`clean:database` calls `supabase stop --no-backup` for the committed project ID, `supabase-notes-quickstart`. It removes the project's local database state. It does not reset a hosted project. Run these commands from this checkout.

Multiple clones use the same Supabase project ID and ports by default. Stop one before using another. To maintain separate stacks, assign distinct project IDs and nonconflicting ports in their `supabase/config.toml` files, then regenerate each clone's `.env.local`.

## What is in the repository?

```text
index.html                         App markup and styles
main.js                            Auth and notes UI
.env.example                       Placeholder browser configuration
supabase/config.toml               Local service configuration
supabase/migrations/               Notes schema, grants, and RLS policies
scripts/setup-env.mjs               Writes local browser configuration
scripts/local-config.mjs            Reads and checks local CLI settings
tests/api.test.mjs                  Direct API authorization tests
tests/notes.spec.mjs                Browser behavior tests
playwright.config.mjs              Isolated test frontend configuration
.github/workflows/test.yml          Automated build and integration checks
```

The browser sends only note content when inserting or updating. PostgreSQL fills in the owner using `auth.uid()`. Column grants restrict writable fields, and row level security policies restrict reads and mutations to the current owner's rows. The migration also checks note length and adds an index for the owner and creation order.

The article's HTML, JavaScript, and SQL are included as complete files. The repository adds setup helpers, pinned dependencies, test coverage, and CI around that example.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `npm ci` reports an unsupported engine | Install Node 22.12 or newer. If using nvm, run `nvm install` and `nvm use` |
| Supabase cannot reach Docker | Start Docker and check `docker info` from the same shell |
| Supabase reports a port conflict | Stop another local Supabase project or assign distinct ports in this project's config |
| Vite says port 5173 is in use | Stop the existing frontend process, or use `npm run dev -- --port 5175` and open that URL |
| The API URL or key is invalid | Check `.env.local`, replace the placeholder if configured manually, and restart Vite |
| Sign-up requests email confirmation | Keep `enable_confirmations = false` in the existing `[auth.email]` section for this local tutorial, then stop and restart the stack |
| The `notes` table is missing | Run `npx supabase migration up --local` from this repository |
| A user sees an empty list | New accounts have no notes. Check the identity shown by the app before expecting another account's data |
| Tests cannot launch Chromium | Run `npx playwright install chromium`, or install the Linux browser dependencies as described above |
| Tests report port 5174 is occupied | Stop the process using that port. Tests deliberately refuse to reuse another frontend |
| Save returns no single row | The note may have been deleted in another window. Click **Refresh notes** |

## Scope and next steps

This example lists the newest 100 notes. It refreshes after its own writes or when you click **Refresh notes**. It does not include realtime subscriptions, offline editing, password recovery, pagination, or conflict resolution. Concurrent saves use the last successful write.

To use a hosted Supabase project, apply the migration using Supabase's [environment workflow](https://supabase.com/docs/guides/deployment/managing-environments), configure its Auth site URL and redirect allowlist, and supply that project's URL and publishable key when building the frontend. Keep email confirmation and email delivery appropriate for real users. The local test suite remains a local-only check, not proof of a hosted deployment.

See the [full article](https://waggertron.github.io/tech-learning/posts/2026-09-28-supabase-postgres-backend-quickstart/) for the platform comparisons and explanation of the access model, and the [Supabase CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started) for local service details.

## License

MIT. See [LICENSE](LICENSE).
