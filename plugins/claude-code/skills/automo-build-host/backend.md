# Autobase lifecycle

How to build a backend on Autobase: SQLite tables, access policies, sign-in, functions.

## 1. Tables (SQLite)

Write plain SQLite. Declare columns with these type names. The database stores SQLite values, and the API returns them as the declared type:

| Declare | Holds | The app receives |
|---|---|---|
| `integer`, `real`, `text` | as named | number, number, string |
| `boolean` | 0/1 | `true` / `false` |
| `timestamptz` | ISO-8601 text | `"2026-10-04T10:30:00+00:00"` |
| `date` | `YYYY-MM-DD` | string |
| `json` | JSON text | object / array |
| `uuid` | text | string |
| `varchar(n)` | text, at most n characters | string |
| `numeric(p, s)` | rounded to s decimals | number |

The API validates writes against these types the way Postgres would: `"abc"` in an integer column, `2024-02-30` in a date column or an over-long `varchar` is refused with an error, never stored.

```sql
create table if not exists todos (
  id integer primary key,                 -- generated, returned as a number
  owner_id uuid not null default (auth.uid()), -- the signed-in user, filled by itself (see §3)
  title text not null,
  done boolean not null default 0,
  due date,
  details json,
  created_at timestamptz not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists todos_owner_idx on todos (owner_id);
```

- Ids: `integer primary key`. Do not use uuid generator functions in defaults.
- Timestamps: the `strftime(...)` default above; never `now()` (that is Postgres).
- Relations: `references other_table (id)` with `on delete cascade` where it fits. Foreign keys are enforced, and they are what makes embedded selects work (`db.from('posts').select('title, author:profiles(name)')`).
- No triggers, no views, no `pragma`, no `begin`/`commit` (each file already runs in one transaction).
- Changing a table later: `alter table … add column …`, `alter table … rename column …`, `drop table if exists …`. To change a column's type, create a new table, copy the rows, drop the old one and rename, all in one migration.

## 2. Access policies

Access control is always on. A table without policies cannot be read or written by anyone using the app.

```sql
-- Each user sees and changes only their own todos.
drop policy if exists "own todos" on todos;
create policy "own todos" on todos
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Everyone, signed in or not, can read published posts.
drop policy if exists "read published" on posts;
create policy "read published" on posts
  for select
  using (published);

-- Team members read their team's documents.
drop policy if exists "team reads" on documents;
create policy "team reads" on documents
  for select to authenticated
  using (exists (select 1 from memberships m where m.team_id = documents.team_id and m.user_id = auth.uid()));
```

- `for select | insert | update | delete | all`; `to anon | authenticated` (omit `to` for everyone).
- `using (…)` picks the rows an operation can see; `with check (…)` must hold for rows being written. An insert that fails `with check` is refused with an error; nothing is stored.
- Several policies for the same operation are combined with OR. Add `as restrictive` to make one that must also hold (AND).
- Inside policies: column names, `auth.uid()`, `auth.role()`, `auth.jwt() ->> 'email'`, comparisons, `and`/`or`/`not`, `is null`, `in (…)`, `like`/`ilike`, `coalesce`, and `exists (select 1 from other_table where …)`. A policy using anything else is refused when the migration is applied, with the reason.
- **No cycles between tables.** A subquery inside a policy only sees the rows that table's own read policy allows, so when table A's policies read table B and B's read policy reads A back, the migration is refused with "infinite recursion detected in policy", exactly as Postgres refuses it. A `security definer` policy helper breaks a cycle: a `language sql` function whose body is one expression, which reads its tables without their policies (`create function is_member(_team integer) returns boolean language sql stable security definer as $$ select exists (select 1 from members m where m.team_id = _team and m.user_id = auth.uid()) $$`, then `using (is_member(team_id))`). Otherwise keep one direction only: the shared table's policies may read the membership table, and the membership table's policies never read the shared one. A check that needs both, such as "only a loan's owner may add members to it", goes in a function (§7) that verifies ownership and then writes with the service key.

```sql
-- Loans are read by their owner and by members; members never look back at loans.
drop policy if exists "read loans" on loans;
create policy "read loans" on loans for select to authenticated
  using (owner_id = auth.uid()
         or exists (select 1 from loan_members m where m.loan_id = loans.id and m.email = auth.jwt() ->> 'email'));

drop policy if exists "read own memberships" on loan_members;
create policy "read own memberships" on loan_members for select to authenticated
  using (added_by = auth.uid() or email = auth.jwt() ->> 'email');
-- No insert policy on loan_members: the add-member function checks that the caller owns the loan, then inserts.
```

## 3. The signed-in user

```typescript
const { data: session } = auth.useSession();
const userId = session?.user.id;           // string; what auth.uid() is in policies

await db.from('todos').insert({ title });  // owner_id fills itself
```

Declare owner columns `uuid not null default (auth.uid())` and leave them out of inserts: the backend fills in the signed-in user. The policy still checks it, so a request that sends another owner is refused. With nobody signed in the default is empty, so a `not null` owner column refuses those rows.

Sign-up and sign-in screens use `auth.signUp.email({ email, password, name })` and `auth.signIn.email({ email, password })`. Both return `{ data, error }`; show `error.message` to the user. Sign out with `auth.signOut()`.

### Sign-in that leaves the page

Everything below comes from the same client file. The platform runs Google and Microsoft with its own apps and sends the emails, so none of it needs keys, provider consoles or an email service. Never ask the user for any.

**Finish on load, once.** Every flow that leaves the page comes back through `completeSignIn()`. Call it in the root component's first effect and act on the answer:

```typescript
import { completeSignIn } from '@/integrations/autobase/client';

useEffect(() => {
  completeSignIn()
    .then((done) => {
      if (done === 'reset-password') navigate('/reset-password');
      if (done === 'email-confirmed') toast.success('Your email is confirmed.');
    })
    .catch((e) => toast.error(e.message)); // an expired link or a failed sign-in, in plain words
}, []);
```

**Google and Microsoft.** One button each; the session arrives through `completeSignIn()` (in a normal tab) or before the call resolves (inside the builder preview, which uses a popup):

```typescript
await signInWithProvider('google');     // or 'microsoft'
```

**Magic link** (sign in from an email; the account is created the first time): `await sendMagicLink(email)`, then tell the user to check their inbox. Pass a page to land on: `sendMagicLink(email, '/dashboard')`.

**Password reset.** A "Forgot password?" link calls `await sendPasswordReset(email)` and always says "If that address has an account, we sent a reset link" (never whether it exists). The email opens `/reset-password` (or the page you pass); `completeSignIn()` answers `'reset-password'`, and that page's form calls `await resetPassword(newPassword)`, then sends the user to sign in.

**Email confirmation.** Sign-up sends a confirmation email by itself; confirming is optional and signing up still signs in. `session.user.emailVerified` says whether it happened; `await resendConfirmation(email)` sends it again.

A Google or Microsoft sign-in whose address already belongs to a password account that was never confirmed is refused with a message to show as is: the person signs in with the password (or confirms the address) first.

## 4. Reading and writing data

The supabase-js API, through `db`:

```typescript
const { data, error } = await db.from('todos').select('id, title, done').order('id');
const { data: created } = await db.from('todos').insert({ title }).select().single();
await db.from('todos').update({ done: true }).eq('id', id);
await db.from('todos').delete().eq('id', id);
const { count } = await db.from('todos').select('*', { count: 'exact', head: true });
```

Supported filters: `eq neq gt gte lt lte like ilike is in contains`, `or(...)`, `not(...)`, JSON paths (`details->>colour`). Always handle `error`.

**One person's data never shows to the next one: key it by the user, never clear the cache.** Put the signed-in user's id in every query key (`['todos', userId]`), or render the signed-in part with `key={userId}`. Never call `queryClient.clear()` (or `removeQueries`) in an effect that runs when the user changes: it also runs on the first load, the moment the session arrives, and wipes the requests the page has just started, so the page waits on a loading screen until something refetches.

## 5. Files (Storage)

Files live in buckets, with the supabase-js storage API through `db.storage`. Create buckets in a migration, and write who may do what as policies on `storage.objects`, exactly as on Supabase:

```sql
-- Buckets: public ones are readable by anyone through their public URL.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('documents', 'documents', false, 10485760, '["application/pdf","image/*"]') on conflict (id) do nothing;

-- Each user uploads, replaces and deletes files in a folder named after their id.
drop policy if exists "own avatar upload" on storage.objects;
create policy "own avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own avatar update" on storage.objects;
create policy "own avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own avatar delete" on storage.objects;
create policy "own avatar delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

-- Private documents: only the owner reads them.
drop policy if exists "own documents" on storage.objects;
create policy "own documents" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and owner = auth.uid())
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
```

```typescript
const path = `${userId}/${file.name}`;
const { error } = await db.storage.from('avatars').upload(path, file, { upsert: true });
const { data } = db.storage.from('avatars').getPublicUrl(path);          // public bucket
const { data: signed } = await db.storage.from('documents').createSignedUrl(path, 3600); // private bucket
const { data: files } = await db.storage.from('documents').list(userId);
await db.storage.from('documents').remove([path]);
```

- Policy columns on `storage.objects`: `bucket_id`, `name` (the path), `owner` (uploader's id), `metadata`. Path helpers: `(storage.foldername(name))[1]`, `storage.filename(name)`, `storage.extension(name)`, `x = any(storage.foldername(name))`.
- A file is 50 MB at most, and an app's files together 1 GB. Image transformations (resize on the fly) are not available.
- Never add or remove files with SQL: always through `db.storage`.

## 6. Live updates (Realtime)

Three kinds, with the supabase-js API through `db.channel(…)`:

```sql
-- A table streams its changes once it is in the realtime publication.
alter publication supabase_realtime add table messages;
```

```typescript
// Changes to a table. Each user only receives rows their select policies allow.
const channel = db
  .channel('room-42')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room_id=eq.42' }, (payload) => {
    setMessages((m) => [...m, payload.new]);
  })
  .subscribe();

// Messages between users on the same channel (cursors, typing indicators), not stored.
db.channel('board').on('broadcast', { event: 'cursor' }, ({ payload }) => moveCursor(payload)).subscribe();
await db.channel('board').send({ type: 'broadcast', event: 'cursor', payload: { x, y } });

// Who is online.
const lobby = db.channel('lobby', { config: { presence: { key: userId } } });
lobby.on('presence', { event: 'sync' }, () => setOnline(Object.keys(lobby.presenceState()))).subscribe(async (status) => {
  if (status === 'SUBSCRIBED') await lobby.track({ name });
});

// Always clean up when the component unmounts.
return () => { db.removeChannel(channel); };
```

- Filters: `column=eq.value` (also `neq`, `lt`, `lte`, `gt`, `gte`, `in.(a,b)`). An update's or delete's `payload.old` carries only the primary key, and deletes reach every subscriber of the table (as on Supabase).
- Only changes made through the app, its functions or the API stream; rows a migration writes do not.
- Limits per app: 200 connections, 100 messages a second. Private channels are not available.

## 7. Functions

For server-side work: calling third-party APIs with secrets, or operations that must bypass policies. One folder per function:

```typescript
// backend/functions/send-invite/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // As the caller: policies apply.
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  // Bypassing policies (use only when the function itself checks permissions):
  // createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { data, error } = await db.from("teams").select("id").limit(1);
  return Response.json({ data, error });
});
```

- Who is calling: the platform checks the caller's token before the function runs and tells it in two request headers. `x-autobase-role` is `anon` (not signed in), `authenticated` (signed in) or `service_role`; `x-autobase-user-id` is the signed-in user's id. A caller can never set these itself, so a function that must serve signed-in users only checks `req.headers.get("x-autobase-role") === "authenticated"` and answers 401 otherwise. Never take a user id from the request body.
- Imports are `npm:` packages. Add every package a function imports to the app's `package.json` dependencies.
- Reading the app's users needs the service key: `admin.auth.admin.listUsers({ page, perPage })` (with `data.total`) and `admin.auth.admin.getUserById(id)`, with `admin` the service-key client above. Nothing else under `auth.admin` exists here (no creating, inviting, updating or deleting users from a function); sign-up and sign-in are the app's `auth` client.
- Call a function from the app with the user's token:

```typescript
const url = `${import.meta.env.VITE_AUTOBASE_URL}/functions/v1/send-invite`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    apikey: import.meta.env.VITE_AUTOBASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${(await auth.token()).data?.token ?? import.meta.env.VITE_AUTOBASE_PUBLISHABLE_KEY}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ email }),
});
```

- A function that must be callable without a key (a webhook) is listed in `backend/config.toml`:

```toml
[functions.stripe-webhook]
verify_jwt = false
```

  One table per function; read the file before adding one.
- Secrets (API keys) are read with `Deno.env.get("NAME")`. To get one, ask with `request_user_approval` type `secret_request` and `"target": "backend"`.
