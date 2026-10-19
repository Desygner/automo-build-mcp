# Installing the Automo Build MCP server

Automo Build is a remote MCP server. Do not clone, build or run anything; there is no package to install and no API key to ask for.

1. Add this entry to the client's MCP settings (for Cline, `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "automo-build": {
      "type": "streamableHttp",
      "url": "https://mcp.automo.build/mcp"
    }
  }
}
```

2. The first tool call opens a browser window where the person signs in to Automo Build (or creates a free account) and approves the connection. No other credentials exist.
3. Call `automo_whoami` once to confirm the connection and list the person's workspaces.

If a tool answers 401, the token expired or was revoked: reconnect the server in the client's MCP settings.
