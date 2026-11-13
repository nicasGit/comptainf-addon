import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

test('HTTP interface, protected settings and OAuth initiation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'myscheduler-test-'));
  const child = spawn(process.execPath, ['myscheduler/server.mjs'], {
    env: { ...process.env, SUPERVISOR_TOKEN: '', DATA_DIR: directory, PORT: '18099' }, stdio: 'pipe'
  });
  const exited = new Promise(resolve => child.once('exit', resolve));
  const base = 'http://127.0.0.1:18099/';
  try {
    let response;
    for (let i = 0; i < 40; i++) {
      try { response = await fetch(base + 'api/state'); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(response?.ok, 'server starts');
    const state = await response.json();
    assert.equal(state.config.dryRun, true);
    assert.equal(state.config.clientSecret, undefined);
    assert.ok(state.csrf);
    assert.match(await (await fetch(base)).text(), /MyScheduler/);
    assert.equal((await fetch(base + 'api/disconnect', { method: 'POST' })).status, 403);
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf };
    const config = { clientId: 'test', clientSecret: 'secret', redirectUri: 'http://localhost:18099/oauth/callback', calendarId: 'primary', dryRun: true, rules: [] };
    const saved = await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify(config) });
    assert.equal(saved.status, 200);
    const publicState = await (await fetch(base + 'api/state')).json();
    assert.equal(publicState.secretSaved, true);
    assert.equal(publicState.config.clientSecret, undefined);
    const connect = await fetch(base + 'api/connect', { method: 'POST', headers });
    const target = new URL((await connect.json()).url);
    assert.equal(target.hostname, 'accounts.google.com');
    assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(target.searchParams.get('state'));
    assert.equal((await fetch(base + 'oauth/callback?state=wrong&code=fake')).status, 400);
    assert.equal((await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify({ ...config, redirectUri: 'http://192.168.1.5/oauth/callback' }) })).status, 400);
  } finally {
    child.kill();
    await exited;
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep));
    await rm(directory, { recursive: true, force: true });
  }
});
