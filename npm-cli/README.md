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

- Developer portal: https://automo.build/developers
- Overview for agents: https://automo.build/llms.txt
- OpenAPI description: https://mcp.automo.build/openapi.json
- Agent registration: https://automo.build/auth.md
