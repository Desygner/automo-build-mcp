#!/usr/bin/env node
// The Automo Build CLI: wires the MCP server into the AI tool you already
// use. The server is remote (https://mcp.automo.build/mcp) with OAuth
// sign-in, so "connecting" is client configuration, nothing more — this tool
// never sees credentials.

import { spawnSync } from 'node:child_process';

const SERVER_URL = 'https://mcp.automo.build/mcp';
const NAME = 'automo-build';

const CLIENTS = {
  'claude-code': {
    label: 'Claude Code',
    command: ['claude', 'mcp', 'add', '--transport', 'http', NAME, SERVER_URL],
    note: 'Then run /mcp inside Claude Code to sign in.',
  },
  codex: {
    label: 'Codex CLI',
    command: ['codex', 'mcp', 'add', NAME, '--url', SERVER_URL],
    note: 'Then approve the sign-in when Codex prompts.',
  },
  cursor: {
    label: 'Cursor',
    command: null,
    manual: [
      'Open Cursor Settings -> MCP -> Add new MCP server, or add to .cursor/mcp.json:',
      JSON.stringify({ mcpServers: { [NAME]: { url: SERVER_URL } } }, null, 2),
    ],
    note: 'Cursor opens the browser to sign in on first use.',
  },
  'claude-ai': {
    label: 'Claude.ai',
    command: null,
    manual: [`Settings -> Connectors -> Add custom connector -> ${SERVER_URL}`],
    note: 'Available on Claude.ai paid plans.',
  },
};

const LINKS = {
  'Developer portal': 'https://automo.build/developers',
  'Site overview for agents': 'https://automo.build/llms.txt',
  'OpenAPI description': 'https://mcp.automo.build/openapi.json',
  'Agent registration (auth.md)': 'https://automo.build/auth.md',
  'Server card': 'https://mcp.automo.build/.well-known/mcp-server-card.json',
};

function help() {
  console.log(`automo-build — connect your AI tool to Automo Build

Usage:
  npx automo-build connect [${Object.keys(CLIENTS).join('|')}]
  npx automo-build connect --print <client>   show the steps without running anything
  npx automo-build links                      the machine-readable surface
  npx automo-build --help

The server: ${SERVER_URL} (Streamable HTTP, OAuth sign-in, scoped tokens).`);
}

function links() {
  for (const [label, url] of Object.entries(LINKS)) console.log(`${label.padEnd(30)} ${url}`);
}

function connect(args) {
  const printOnly = args.includes('--print');
  const name = args.find((a) => !a.startsWith('--'));
  const client = name ? CLIENTS[name] : null;
  if (!client) {
    console.log(`Pick a client: ${Object.keys(CLIENTS).join(', ')}`);
    process.exitCode = name ? 1 : 0;
    return;
  }
  if (client.command) {
    const [bin, ...rest] = client.command;
    const printable = client.command.join(' ');
    if (printOnly) {
      console.log(`Run:\n  ${printable}\n${client.note}`);
      return;
    }
    const run = spawnSync(bin, rest, { stdio: 'inherit' });
    if (run.error || run.status !== 0) {
      console.log(`\nCould not run ${client.label} directly. Run this yourself:\n  ${printable}`);
      process.exitCode = run.status ?? 1;
      return;
    }
    console.log(`\nConnected to ${client.label}. ${client.note}`);
    return;
  }
  console.log(`${client.label}:`);
  for (const line of client.manual) console.log(line);
  console.log(client.note);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === '--help' || cmd === 'help' || cmd === '-h') help();
else if (cmd === 'connect') connect(rest);
else if (cmd === 'links') links();
else {
  console.log(`Unknown command '${cmd}'.`);
  help();
  process.exitCode = 1;
}
