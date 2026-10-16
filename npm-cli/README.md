# automo-build

Connect your AI tool to [Automo Build](https://automo.build), the AI app
builder: describe software in plain language, get a real React, TypeScript and
Supabase application, tested, reviewed and deployed.

```sh
npx automo-build connect claude-code   # or codex, cursor, claude-ai
```

That wires the remote MCP server (`https://mcp.automo.build/mcp`, OAuth
sign-in, scoped revocable tokens) into your client. Your tool then operates
Automo Build as you: create projects, prompt the builder, ask the CTO, Doctor,
Security and QA agents, draft and publish deployments.

How auth works: OAuth 2.1 authorization code with PKCE. There is no API-key
signup and no client registration dashboard; a client identifies itself with a
Client ID Metadata Document (its `client_id` is an HTTPS URL it hosts), MCP
clients handle the whole flow for you, and agents can register users
programmatically per https://automo.build/auth.md.

- Developer portal: https://automo.build/developers
- Overview for agents: https://automo.build/llms.txt
- OpenAPI description: https://mcp.automo.build/openapi.json
- Agent registration: https://automo.build/auth.md
