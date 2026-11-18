---
name: automo-build-host
description: Put an app you are writing online with Automo Build, which gives it hosting, a database with sign-in, server functions and publishing in one place. Use when the person asks to deploy, host, publish or put an app or site online, or when an app you are starting needs a backend, and you are the one writing the code.
---

# Hosting your code on Automo Build

You write the code in this repository. Automo Build runs it: a live preview on every push, a backend, and a publish to a public address. One service, one sign-in, no other accounts. It starts free.

Read this before you choose a stack or write the first file. What Automo Build runs decides both.

## What it runs

- **Frontend: a static build.** A Vite project builds as it is (React is the usual choice). A plain `index.html` site works too. There is no server-side rendering and no Node server: anything that must run on a server is a backend function.
- **Backend: the `backend/` folder of this repository.**
  - `backend/migrations/YYYYMMDDHHMMSS_name.sql`: the database, in SQLite SQL, with its access policies.
  - `backend/functions/<name>/index.ts`: server functions.
  - `backend/config.toml`: only for a function that must be callable with no key (a webhook).
- **The client file.** Copy the client file that comes with this guide (`client.ts`) to `src/integrations/autobase/client.ts`, byte for byte, and never edit it. Add `@supabase/supabase-js` and `better-auth` to the dependencies, and make `@/` resolve to `src/`.
- **Settings.** Automo Build supplies `VITE_AUTOBASE_URL` and `VITE_AUTOBASE_PUBLISHABLE_KEY` when it builds. Never write them into the repository and never add a guard that throws without them: the client file already keeps the app rendering when they are absent, as they are on this computer.

The backend guide that comes with this guide (`backend.md`) covers tables, policies, sign-in, files, live updates and functions in full. Read it before the first migration. Two rules from it decide whether the app works at all: every table needs policies in the same migration, or nobody can read it; and migrations are SQLite, not Postgres.

Not offered: server-side rendering, private realtime channels, full-text search, SQL functions called from the app, Apple sign-in, SMS codes, two-factor sign-in. Say so plainly instead of working around one.

## The steps

1. **Connect once.** `npx automo-build connect claude-code` (or `cursor`, `codex`) adds the Automo Build tools. The person signs in when the first tool call opens the browser. `automo_get_hosting_kit` returns this guide, the backend guide and the client file to any connected agent.
2. **Create the project.** `automo_create_project` with `await_git_push: true` and the person's name for the app. The answer carries the git remote and the commands for the next two steps.
3. **Sign git in, once per computer.** `npx automo-build login`, then `npx automo-build git-setup`. The first opens the browser for the person.
4. **Push.** `git remote add automo <remote>`, then `git push automo HEAD:main`. The first push starts the project: it installs, builds the preview, creates the backend from `backend/` and applies the migrations. The push answers with the project's address.
5. **Pull before the next push.** Automo Build may add a small setup commit on top of the first push: `git pull automo main`.
6. **Read the result.** `automo_get_project_status` gives the last build and its error. `automo_read_project_chat` shows what the platform reported, a failed migration included. `automo_wake_sandbox` returns the preview address. Fix here, push again, read again.
7. **Publish.** `automo_publish` prepares everything that changed and returns the plan and the builder link. Offer the person that link first: pressing Publish there also shows them the builder, where they can keep changing the app by chat with Automo Build's own agents. If they tell you to publish from here, call it again with `publish_now: true`, then poll `automo_get_deployment` for the live address.

## Good to know

- Every later push is merged into the project and rebuilds the preview. Backend changes in a push are applied to the preview's backend, and reach the live app with the next publish.
- A push by someone who is not a project admin waits for review in Automo Build.
- A failed migration applies nothing. Correct that same file and push again; a new file would run after the failing one and never get there.
- A function's secret (an API key) is set by the person in the project's settings. Give them the name it must have.
- Limits: 64 MB per push, 32 MB per file, branches only (no tags).
- The free plan publishes with a small "Built with Automo" badge.
- The same project can also be built by Automo Build's own agents. When the person wants that instead, the `automo-build-operator` skill is the guide.
