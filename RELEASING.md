# Releasing

```sh
scripts/release.sh --check   # what is behind; changes nothing
scripts/release.sh           # publish npm and the MCP registry
```

1. Bump the version: `plugins.ts` in the platform repo (plugin and `server.json`), `plugin.json` here, and
   `npm-cli/package.json` if the tool changed. Run `npm run mcp:plugins` there.
2. Deploy the platform first if the plugin names anything new.
3. Commit and push here. Claude Code and Cursor read this repo directly.
4. `scripts/release.sh`, then `--check` must say "everything is published".

**Do not edit generated files.** Only these are written by hand: `AGENTS.md`, `plugin.json`, `npm-cli/`,
`.claude-plugin/`, `scripts/`, `plugins/*/assets/`, this file.

**New machine:** install `mcp-publisher`, copy `.env.example` to `.env`, fill the two values.

## Needs a person

| Directory | Blocked on |
|---|---|
| ChatGPT and Codex | A person at platform.openai.com/plugins. Steps below |
| Claude Connectors | A submission at claude.ai/directory/manage, with a test account that has a built project |
| Cursor Marketplace | Nothing. Submitted 2026-10-19, in review |
| Cline | Not possible: needs a sign-in method the server does not offer |

## ChatGPT and Codex directory

1. `scripts/openai-zip.sh`, then upload the ZIP at platform.openai.com/plugins.
2. The portal shows a domain token. Set it as `OPENAI_APPS_CHALLENGE` on the server and deploy; the server then
   answers it at `https://mcp.automo.build/.well-known/openai-apps-challenge`.
3. Review details: the test cases are in the manifest. Add a test account with no second sign-in step, a video walkthrough.
4. Submit. After approval, press Publish plugin.

Official steps: https://developers.openai.com/apps-sdk/deploy/submission
