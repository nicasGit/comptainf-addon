import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

test('HTTP interface, protected settings and OAuth initiation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'myscheduler-test-'));
  // Existing 0.1.0 installation, without credentials or network requests.
  await writeFile(join(directory, 'state.json'), JSON.stringify({ config: {
    clientId: '', clientSecret: '', redirectUri: '', calendarId: 'legacy@example.com', dryRun: true,
    rules: [{ id: 'legacy-rule', keyword: 'Présence', entity: 'climate.salon', priority: 0, temperature: 21, endTemperature: 17 }]
  }, tokens: {}, active: {}, applied: {} }));
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
    assert.deepEqual(state.config.calendarIds, ['legacy@example.com']);
    assert.equal(state.config.calendarId, undefined);
    assert.deepEqual(state.config.rules[0].during, { service: 'climate.set_temperature', data: { temperature: 21 } });
    assert.deepEqual(state.config.rules[0].after, { service: 'climate.set_temperature', data: { temperature: 17 } });
    assert.equal(state.config.clientSecret, undefined);
    assert.ok(state.csrf);
    assert.match(await (await fetch(base)).text(), /MyScheduler/);
    for (const module of ['ui.mjs', 'home-assistant.mjs', 'actions.mjs', 'labels.mjs']) {
      const asset = await fetch(base + module);
      assert.equal(asset.status, 200);
      assert.match(asset.headers.get('Content-Type'), /javascript/);
    }
    assert.equal((await fetch(base + 'api/disconnect', { method: 'POST' })).status, 403);
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf };
    const genericRule = { id: 'light-rule', keyword: 'Présence', entity: 'light.salon', priority: 0,
      during: { service: 'light.turn_on', data: { brightness_pct: 60 } }, after: { service: 'light.turn_off', data: {} },
      allDay: { enabled: true, timeZone: 'Europe/Zurich', periods: [{ id: 'evening', days: [5], start: '19:00', end: '22:00', mode: 'during' }] } };
    const config = { clientId: 'test', clientSecret: 'secret', redirectUri: 'http://localhost:18099/oauth/callback', calendarIds: ['primary', 'work@example.com'], dryRun: true, rules: [genericRule] };
    const saved = await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify(config) });
    assert.equal(saved.status, 200);
    const publicState = await (await fetch(base + 'api/state')).json();
    assert.equal(publicState.secretSaved, true);
    assert.equal(publicState.config.clientSecret, undefined);
    assert.deepEqual(publicState.config.calendarIds, config.calendarIds);
    assert.deepEqual(publicState.config.rules, [genericRule]);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')).config.calendarIds, config.calendarIds);
    const invalid = await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify({ ...config, calendarIds: [] }) });
    assert.equal(invalid.status, 400);
    assert.deepEqual((await (await fetch(base + 'api/state')).json()).config.calendarIds, config.calendarIds);
    assert.equal((await fetch(base + 'api/catalog', { method: 'POST', headers })).status, 400);
    const badRule = { ...genericRule, during: { service: 'light.turn_on', data: { entity_id: 'all' } } };
    assert.equal((await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify({ ...config, rules: [badRule] }) })).status, 400);
    const weekly = { ...genericRule, source: 'weekly', keyword: undefined, name: 'Weekly without Google', weekly: genericRule.allDay };
    const offline = await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify({ ...config, clientId: '', clientSecret: '', redirectUri: '', rules: [weekly] }) });
    assert.equal(offline.status, 200);
    assert.equal((await (await fetch(base + 'api/state')).json()).config.rules[0].source, 'weekly');
    // Restore credentials for the OAuth checks below.
    assert.equal((await fetch(base + 'api/config', { method: 'POST', headers, body: JSON.stringify(config) })).status, 200);
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
