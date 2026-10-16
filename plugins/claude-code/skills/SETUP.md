---
name: SETUP
description: First-run setup for the Automo Build plugin. Activates when the Automo Build MCP server is not connected yet or answers 401.
---

# Connecting Automo Build

The plugin declares the Automo Build MCP server at https://mcp.automo.build/mcp. On first use the host opens a browser window where the person signs in to Automo Build and approves the connection; nothing else is required.

If a tool answers with a 401, the connection was disconnected or expired: run the host's MCP reconnect (in Claude Code, `/mcp` then reconnect `automo-build`).

Once connected, call `automo_whoami` once to learn the workspaces available, then follow the automo-build-operator skill.
