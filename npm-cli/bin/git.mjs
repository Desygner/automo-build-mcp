// git.automo.build sign-in: `automo-build login` and a git credential helper, so `git clone` / `git push`
// work with your Automo Build account and no token to copy.
//
//   automo-build login          sign in in the browser (OAuth 2.1, PKCE, a loopback redirect)
//   automo-build git-setup      tell git to ask this helper for git.automo.build
//   automo-build git-credential get|store|erase      the helper git calls (reads git's protocol on stdin)
//   automo-build logout         forget the stored sign-in
//
// The client registers itself once (RFC 7591) and stores its id with the tokens in
// ~/.config/automo-build/credentials.json, readable by you only. Access tokens are short-lived and are
// refreshed on demand; nothing is ever printed except to git, on its own pipe.

import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ISSUER = process.env.AUTOMO_BUILD_OAUTH_ISSUER || 'https://mcp.automo.build';
const GIT_HOST = process.env.AUTOMO_BUILD_GIT_HOST || 'git.automo.build';
const SCOPES = 'git:read git:write';
const DIR = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'automo-build');
const FILE = join(DIR, 'credentials.json');

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function load() {
  try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return null; }
}
function save(data) {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  writeFileSync(FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  chmodSync(FILE, 0o600);
}

async function metadata() {
  const res = await fetch(`${ISSUER}/.well-known/oauth-authorization-server`);
  if (!res.ok) throw new Error(`could not reach ${ISSUER} (${res.status})`);
  return res.json();
}

async function register(meta, redirectUri) {
  const res = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'Automo Build CLI (git)', redirect_uris: [redirectUri], grant_types: ['authorization_code', 'refresh_token'], token_endpoint_auth_method: 'none' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.client_id) throw new Error(`could not register this computer: ${body.error_description || body.error || res.status}`);
  return body.client_id;
}

async function tokenRequest(meta, params) {
  const res = await fetch(meta.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(body.error_description || body.error || `token request failed (${res.status})`);
  return body;
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch { /* the URL is printed anyway */ }
}

export async function login() {
  const meta = await metadata();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(16));

  // The loopback listener: any free port; the server matches loopback redirects regardless of port.
  const server = createServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
  const stored = load();
  const clientId = stored?.issuer === ISSUER && stored.client_id ? stored.client_id : await register(meta, 'http://127.0.0.1/callback');

  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { server.close(); reject(new Error('sign-in timed out after 5 minutes')); }, 5 * 60_000);
    server.on('request', (req, res) => {
      const u = new URL(req.url, redirectUri);
      if (u.pathname !== '/callback') { res.writeHead(404).end(); return; }
      const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end(ok ? 'Signed in to Automo Build. You can close this tab and go back to the terminal.\n' : 'Sign-in did not complete. Go back to the terminal and try again.\n');
      clearTimeout(timer);
      server.close();
      if (ok) resolve(u.searchParams.get('code'));
      else reject(new Error(u.searchParams.get('error_description') || u.searchParams.get('error') || 'sign-in was not completed'));
    });
    const url = new URL(meta.authorization_endpoint);
    for (const [k, v] of Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: SCOPES, state, code_challenge: challenge, code_challenge_method: 'S256' })) url.searchParams.set(k, v);
    console.log(`Opening your browser to sign in. If it does not open, visit:\n\n  ${url}\n`);
    openBrowser(url.toString());
  });

  const tok = await tokenRequest(meta, { grant_type: 'authorization_code', code, code_verifier: verifier, client_id: clientId, redirect_uri: redirectUri });
  save({ issuer: ISSUER, client_id: clientId, access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + (tok.expires_in ?? 600) * 1000, scope: tok.scope });
  console.log(`Signed in. git can now reach ${GIT_HOST}.`);
  if (!helperConfigured()) console.log(`\nOne more step, once: run\n\n  npx automo-build git-setup\n`);
}

async function freshAccessToken() {
  const c = load();
  if (!c?.access_token) return null;
  if (c.expires_at - Date.now() > 60_000) return c.access_token;
  if (!c.refresh_token) return null;
  try {
    const tok = await tokenRequest(await metadata(), { grant_type: 'refresh_token', refresh_token: c.refresh_token, client_id: c.client_id });
    save({ ...c, access_token: tok.access_token, refresh_token: tok.refresh_token ?? c.refresh_token, expires_at: Date.now() + (tok.expires_in ?? 600) * 1000, scope: tok.scope ?? c.scope });
    return tok.access_token;
  } catch {
    return null;
  }
}

function readGitInput() {
  const text = readFileSync(0, 'utf8');
  return Object.fromEntries(text.split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

/** git's credential helper protocol: answer `get` for git.automo.build only; ignore everything else. */
export async function gitCredential(action) {
  if (action !== 'get') { if (action === 'store' || action === 'erase') readGitInput(); return; }
  const input = readGitInput();
  if (input.host !== GIT_HOST || (input.protocol && input.protocol !== 'https' && GIT_HOST === 'git.automo.build')) return;
  const token = await freshAccessToken();
  if (!token) { process.stderr.write('Automo Build: not signed in. Run: npx automo-build login\n'); return; }
  process.stdout.write(`username=automo-build\npassword=${token}\n`);
}

function helperConfigured() {
  const r = spawnSync('git', ['config', '--global', '--get', `credential.https://${GIT_HOST}.helper`], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim().length > 0;
}

export function gitSetup() {
  const helper = '!npx -y automo-build git-credential';
  const r = spawnSync('git', ['config', '--global', `credential.https://${GIT_HOST}.helper`, helper], { stdio: 'inherit' });
  if (r.status !== 0) { console.log(`Could not set it. Run this yourself:\n  git config --global credential.https://${GIT_HOST}.helper '${helper}'`); process.exitCode = 1; return; }
  console.log(`git now asks Automo Build for ${GIT_HOST}. Clone with: git clone https://${GIT_HOST}/p/<project-id>.git`);
}

export function logout() {
  if (existsSync(FILE)) rmSync(FILE);
  console.log('Signed out on this computer.');
}
