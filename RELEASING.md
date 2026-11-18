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
`.claude-plugin/`, `scripts/`, `plugins/cursor/assets/`, this file.

**New machine:** install `mcp-publisher`, copy `.env.example` to `.env`, fill the two values.

## Needs a person

| Directory | Blocked on |
|---|---|
| ChatGPT and Codex | Business verification: https://platform.openai.com/settings/organization/general |
| Claude Connectors | A submission at claude.ai/directory/manage, with a test account that has a built project |
| Cursor Marketplace | Nothing. Submitted 2026-10-19, in review |
| Cline | Not possible: needs a sign-in method the server does not offer |

ChatGPT steps after verification: https://developers.openai.com/apps-sdk/deploy/submission
