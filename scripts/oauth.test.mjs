import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const jar = new Map();
let data = { users: [], sessions: [] };
let requests = [];
const mocks = {
  'server-only': {},
  'next/headers': { cookies: async () => ({ get: key => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key, value) => jar.set(key, value), delete: key => jar.delete(key) }) },
  'next/server': { NextResponse: { redirect: url => ({ location: String(url) }) } },
  './collab-store': { store: fn => fn(data) },
  '@/lib/collab-store': { store: fn => fn(data) },
};
function load(path) {
  const compiled = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', source)(id => mocks[id] ?? require(id), compiled, compiled.exports);
  return compiled.exports;
}
const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;
try {
  process.env.OAUTH_CLIENT_ID = 'test-client';
  process.env.OAUTH_CLIENT_SECRET = 'test-secret';
  delete process.env.OAUTH_REDIRECT_URI;
  const auth = load('src/lib/auth.ts');
  mocks['@/lib/auth'] = auth;
  const start = load('src/app/api/auth/google/route.ts').GET;
  const callback = load('src/app/api/auth/google/callback/route.ts').GET;
  const login = new URL((await start(new Request('http://localhost:3100/api/auth/google'))).location);
  assert.equal(login.origin, 'https://accounts.google.com');
  assert.equal(login.searchParams.get('redirect_uri'), 'http://localhost:3100/api/auth/google/callback');
  assert.equal(login.searchParams.get('code_challenge_method'), 'S256');
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json(requests.length === 1 ? { access_token: 'test-token' } : { sub: 'google-user', email: 'artist@example.com', email_verified: true, name: 'Artist' });
  };
  const callbackUrl = `http://internal:3000/api/auth/google/callback?code=test&state=${login.searchParams.get('state')}`;
  const result = await callback(new Request(callbackUrl));
  assert.equal(new URL(result.location).pathname, '/collab');
  assert.equal(new URL(result.location).origin, 'http://localhost:3100');
  assert.equal(requests[0].options.body.get('redirect_uri'), login.searchParams.get('redirect_uri'));
  assert.equal(data.users.length, 1);
  assert.equal(data.sessions.length, 1);
  assert.equal(await auth.currentUser(), data.users[0]);
  assert.equal(jar.has('oauth_state'), false);
  assert.equal(jar.has('oauth_redirect_uri'), false);
  requests = [];
  const replay = await callback(new Request(callbackUrl));
  assert.equal(new URL(replay.location).searchParams.get('error'), 'session');
  assert.equal(requests.length, 0);
  await start(new Request('http://localhost:3100/api/auth/google'));
  const invalid = await callback(new Request('http://localhost:3100/api/auth/google/callback?code=test&state=wrong'));
  assert.equal(new URL(invalid.location).searchParams.get('error'), 'session');
  assert.equal(requests.length, 0);
  await start(new Request('http://localhost:3100/api/auth/google'));
  const cancelled = await callback(new Request('http://localhost:3100/api/auth/google/callback?error=access_denied'));
  assert.equal(new URL(cancelled.location).searchParams.get('error'), 'cancelled');
  for (const [googleError, expected] of [['invalid_client', 'credentials'], ['invalid_grant', 'code'], ['redirect_uri_mismatch', 'redirect'], ['unknown', 'token']]) {
    const attempt = new URL((await start(new Request('http://localhost:3100/api/auth/google'))).location);
    globalThis.fetch = async () => Response.json({ error: googleError, error_description: 'private diagnostic' }, { status: 400 });
    const failure = await callback(new Request(`http://localhost:3100/api/auth/google/callback?code=test&state=${attempt.searchParams.get('state')}`));
    assert.equal(new URL(failure.location).searchParams.get('error'), expected);
    assert.equal(failure.location.includes('private'), false);
    assert.equal(data.sessions.length, 1);
  }
  process.env.OAUTH_REDIRECT_URI = 'https://art.example.com/api/auth/google/callback';
  assert.equal((await start(new Request('http://localhost:3100/api/auth/google'))).location, 'https://art.example.com/api/auth/google');
  process.env.OAUTH_REDIRECT_URI = 'https://art.example.com/wrong';
  assert.equal(new URL((await start(new Request('http://localhost:3100/api/auth/google'))).location).searchParams.get('error'), 'config');
  console.log('OAuth checks passed: PKCE, stable callback, session, replay, invalid state, cancellation, canonical origin, invalid config.');
} finally {
  process.env = savedEnv;
  globalThis.fetch = savedFetch;
}
