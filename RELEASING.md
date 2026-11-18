# Releasing

One command says what is behind, one command publishes it.

```sh
scripts/release.sh --check   # what is published, what is not; changes nothing
scripts/release.sh           # publish what is behind
```

## What this repository publishes

| What | Where it goes | How it gets there |
|---|---|---|
| The plugin (skills, manifests, README) | Claude Code and Cursor read this repository | `git push` |
| The command-line tool, `npm-cli/` | npm, package `automo-build` | `scripts/release.sh` |
| `server.json` | The official MCP registry, `build.automo/automo-build`. Smithery, Glama and PulseMCP follow it | `scripts/release.sh` |
| `plugins/openai/` | The ChatGPT and Codex plugin directory | By hand, below |

## Where the files come from

- **Generated.** Everything except the files listed next is written by the Automo Build platform repository
  (private): `npm run mcp:plugins` in `services/agent-runtime`. Do not edit these here; the next run overwrites
  them. They come from the server's own instructions, its tool catalog and the backend guide.
- **Written here by hand.** `AGENTS.md`, `plugin.json`, `npm-cli/`, `.claude-plugin/`, `RELEASING.md`,
  `scripts/`, `plugins/cursor/assets/`.

## A release, step by step

1. **Version.** A release needs a new version or the registries refuse it.
   - Plugin and `server.json`: `VERSION` and the registry version in `plugins.ts`, in the platform repository.
     Then run the generator.
   - `plugin.json` at the root: by hand, same number as the plugin.
   - Command-line tool: `npm-cli/package.json`, only when `npm-cli/` changed.
2. **Deploy the platform first** when the plugin names a tool or a behaviour that is new. An agent that follows
   a skill to a tool that does not exist yet fails.
3. **Commit and push this repository.** Claude Code and Cursor users have the new plugin from this moment.
4. **`scripts/release.sh`.** It publishes the command-line tool to npm and `server.json` to the MCP registry,
   each only when its version is ahead of what is live.
5. **`scripts/release.sh --check`.** It must say "everything is published".

## One-time setup on a new machine

- **Tools:** Node 18 or later, and `mcp-publisher`
  (https://github.com/modelcontextprotocol/registry, releases).
- **Credentials:** copy `.env.example` to `.env` and fill in the two values. `.env` is gitignored and the script
  refuses to run if it is not.
  - `NPM_TOKEN`: a granular access token for the npm account `automo`, read and write on `automo-build`, with
    two-factor bypass on. A browser sign-in (`npm login`) expires; this does not.
  - `MCP_PRIVATE_KEY`: the Ed25519 key behind the `v=MCPv1` TXT record on `automo.build`, as hex. `.env.example`
    has the command that prints it from the PEM file. The registry sign-in it gives lasts minutes, so the script
    signs in on every release.

## Directories that are not a command

| Directory | State | What a new version needs |
|---|---|---|
| Cursor Marketplace | Submitted 2026-10-19, in review | Nothing: it reads this repository |
| Claude Connectors Directory | Not submitted | The portal at claude.ai/directory/manage, a paid Claude account, a reviewer test account |
| ChatGPT and Codex plugin directory | Not submitted | See below |
| Cline MCP Marketplace | Blocked | Cline needs dynamic client registration, which the server does not offer |

### ChatGPT and Codex plugin directory

Official steps: https://developers.openai.com/apps-sdk/deploy/submission

1. **Verify the business** at https://platform.openai.com/settings/organization/general. Nothing else can start
   before this.
2. **Build the ZIP** from `plugins/openai/`: `plugin.json` with the listing fields, `skills/`, the logo under
   `assets/`, and `mcp.json` naming the one server, `https://mcp.automo.build/mcp`.
3. **Upload** at https://platform.openai.com/plugins, "Upload new or existing plugin".
4. **Domain check.** The portal gives a token. The server must answer it, as plain text, at
   `https://mcp.automo.build/.well-known/openai-apps-challenge`. The server does not do this yet: it is a
   platform change.
5. **Review details.** A test account that signs in with no second step and has a built project and one
   deployment; five prompts that should work, each with the tools and result expected; three prompts the plugin
   should refuse; a video walkthrough; privacy, terms, support and website addresses.
6. **Submit**, answer the review by email, then press **Publish plugin** on the approved version.
7. **After that**, a server change needs only "Rescan" in the portal. A change to skills or listing text needs a
   new ZIP and a new review.
