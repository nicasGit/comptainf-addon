import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { plan, validateRules } from './engine.mjs';
import { calendarIds, collectEvents } from './calendars.mjs';
import { actionSignature } from './actions.mjs';
import { createHomeAssistant } from './home-assistant.mjs';
import { calendarSnapshot } from './snapshot.mjs';

const directory = process.env.DATA_DIR || './data';
await mkdir(directory, { recursive: true, mode: 0o700 });
const file = `${directory}/state.json`;
let state;
try { state = JSON.parse(await readFile(file, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
state ||= { config: { clientId: '', clientSecret: '', redirectUri: '', calendarIds: ['primary'], dryRun: true, rules: [] }, tokens: {}, active: {}, applied: {} };
// Preserve the existing calendar and Google authorization when upgrading from 0.1.0.
state.config.calendarIds = calendarIds(state.config);
delete state.config.calendarId;
state.config.rules = validateRules(state.config.rules);
// Serialize writes so simultaneous refresh/config operations cannot corrupt the file.
let saving = Promise.resolve();
function save() {
  const snapshot = JSON.stringify(state);
  saving = saving.then(async () => {
    await writeFile(`${file}.tmp`, snapshot, { mode: 0o600 });
    await rename(`${file}.tmp`, file);
  });
  return saving;
}
let pending;
let busy = false;
let simulatedActive = {};
let status = { message: 'En attente de connexion Google.', events: [], actions: [], lastSync: null };
const csrf = randomBytes(32).toString('hex');
const scope = 'https://www.googleapis.com/auth/calendar.readonly';
async function remote(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error(`Service distant : HTTP ${response.status}. Vérifier la connexion et les autorisations.`);
  return response.status === 204 ? {} : response.json();
}
const homeAssistant = createHomeAssistant(process.env.SUPERVISOR_TOKEN, remote);
async function tokenRequest(parameters) {
  const tokens = await remote('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: state.config.clientId, client_secret: state.config.clientSecret, ...parameters })
  });
  state.tokens = { ...state.tokens, ...tokens, expires_at: Date.now() + tokens.expires_in * 1000 };
  await save();
  return state.tokens.access_token;
}
async function accessToken() {
  if (state.tokens.access_token && state.tokens.expires_at > Date.now() + 60000) return state.tokens.access_token;
  if (!state.tokens.refresh_token) throw Error('Connecter le compte Google.');
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: state.tokens.refresh_token });
}
async function google(path, query = {}) {
  const token = await accessToken();
  const items = [];
  let pageToken;
  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/${path}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await remote(url, { headers: { Authorization: `Bearer ${token}` } });
    items.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}
async function tick() {
  if (busy) return;
  busy = true;
  try {
    const snapshotCalendar = await calendarSnapshot(state.config.rules, () => collectEvents(state.config.calendarIds, google));
    const { events } = snapshotCalendar;
    const result = plan(events, state.config.rules, state.config.dryRun ? { ...state.active, ...simulatedActive } : state.active, Date.now(), snapshotCalendar);
    const actions = Object.values(result.desired);
    // Retain outgoing rules until every command succeeds, including across restart.
    if (!state.config.dryRun) {
      const snapshot = actions.length ? await homeAssistant.catalog() : null;
      state.active = { ...state.active, ...result.active };
      await save();
      for (const action of actions) {
        const signature = actionSignature(action);
        if (state.applied[action.entity] === signature) continue;
        await homeAssistant.execute(action, snapshot);
        state.applied[action.entity] = signature;
        await save();
      }
      state.active = result.active;
      // End commands are retried after failure but not repeated on successful polls.
      for (const entity of Object.keys(state.applied)) if (!result.active[entity]) delete state.applied[entity];
      await save();
      simulatedActive = {};
    } else simulatedActive = result.active;
    status = { message: `${state.config.dryRun ? 'Simulation : aucune commande envoyée.' : 'Planification active.'}${snapshotCalendar.warning ? ` ${snapshotCalendar.warning}` : ''}`,
      events: events.map(e => ({ title: e.summary || '', calendarId: e.calendarId, allDay: Boolean(e.start?.date), start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date })),
      actions, lastSync: new Date().toISOString() };
  } catch (e) { status.message = e.message; }
  finally { busy = false; }
}
function json(res, value, code = 200) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); }
async function body(req) {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 65536) throw Error('Requête trop volumineuse.'); }
  return JSON.parse(text || '{}');
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // No published port. In HAOS only Supervisor ingress may reach the interface.
  if (process.env.SUPERVISOR_TOKEN && req.socket.remoteAddress !== '172.30.32.2' && req.socket.remoteAddress !== '::ffff:172.30.32.2') {
    res.writeHead(403); res.end('Ingress requis.'); return;
  }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  try {
    if (req.method === 'GET' && path === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(await readFile(fileURLToPath(new URL('./ui.html', import.meta.url)))); return;
    }
    if (req.method === 'GET' && ['/ui.mjs', '/home-assistant.mjs', '/actions.mjs', '/labels.mjs'].includes(path)) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.end(await readFile(fileURLToPath(new URL(`.${path}`, import.meta.url)))); return;
    }
    if (req.method === 'GET' && path === '/api/state') {
      const { clientSecret, ...config } = state.config;
      json(res, { config, secretSaved: Boolean(clientSecret), connected: Boolean(state.tokens.refresh_token), csrf, status }); return;
    }
    if (req.method === 'GET' && path === '/oauth/callback') {
      const received = url.searchParams.get('state') || '';
      const expected = pending?.state || '';
      if (!expected || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected)) || Date.now() > pending.expires) throw Error('Connexion expirée. Recommencer.');
      const attempt = pending; pending = null;
      const code = url.searchParams.get('code');
      if (!code) throw Error('Autorisation Google refusée.');
      await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: state.config.redirectUri, code_verifier: attempt.verifier });
      res.writeHead(302, { Location: state.config.redirectUri.replace(/oauth\/callback$/, '') }); res.end(); return;
    }
    if (req.method !== 'POST' || req.headers['x-csrf-token'] !== csrf) { json(res, { error: 'Requête refusée.' }, 403); return; }
    if (path === '/api/catalog') { json(res, await homeAssistant.catalog()); return; }
    if (busy) { json(res, { error: 'Synchronisation en cours, réessayer dans quelques secondes.' }, 409); return; }
    if (path === '/api/config') {
      const input = await body(req);
      const rules = validateRules(input.rules);
      const needsGoogle = rules.some(rule => rule.source !== 'weekly' && rule.enabled !== false);
      if (needsGoogle || input.redirectUri) {
        const redirect = new URL(input.redirectUri);
        if (!(redirect.protocol === 'https:' || (redirect.protocol === 'http:' && redirect.hostname === 'localhost')) || !redirect.pathname.endsWith('/oauth/callback') || redirect.search || redirect.hash || redirect.username || redirect.password) throw Error('URL de retour HTTPS finissant par /oauth/callback requise (localhost autorisé en développement).');
      }
      const selectedCalendars = calendarIds(input);
      if (typeof input.clientId !== 'string' || needsGoogle && !input.clientId.trim() || typeof input.dryRun !== 'boolean') throw Error('Configuration incomplète.');
      if (input.clientSecret && typeof input.clientSecret !== 'string') throw Error('Secret invalide.');
      if (needsGoogle && !(input.clientSecret || state.config.clientSecret)) throw Error('Secret OAuth requis.');
      if (input.clientId !== state.config.clientId) state.tokens = {};
      state.config = { clientId: input.clientId.trim(), clientSecret: input.clientSecret || state.config.clientSecret,
        redirectUri: input.redirectUri, calendarIds: selectedCalendars, dryRun: input.dryRun, rules };
      pending = null;
      await save(); json(res, { ok: true }); return;
    }
    if (path === '/api/connect') {
      if (!state.config.clientId || !state.config.clientSecret) throw Error('Enregistrer les identifiants Google.');
      pending = { state: randomBytes(32).toString('hex'), verifier: randomBytes(48).toString('base64url'), expires: Date.now() + 600000 };
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      target.search = new URLSearchParams({ client_id: state.config.clientId, redirect_uri: state.config.redirectUri, response_type: 'code', scope,
        access_type: 'offline', prompt: 'consent', state: pending.state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(pending.verifier).digest('base64url') });
      json(res, { url: target.href }); return;
    }
    if (path === '/api/disconnect') {
      // Local disconnect; Google account permissions can additionally be revoked by the owner.
      state.tokens = {}; pending = null; await save(); status.message = 'Compte Google déconnecté. Les programmes hebdomadaires continuent.'; json(res, { ok: true }); return;
    }
    if (path === '/api/calendars') { json(res, await google('users/me/calendarList')); return; }
    if (path === '/api/sync') { await tick(); json(res, status); return; }
    json(res, { error: 'Introuvable.' }, 404);
  } catch (e) { json(res, { error: e.message }, 400); }
});
server.listen(Number(process.env.PORT || 8099), process.env.SUPERVISOR_TOKEN ? '0.0.0.0' : '127.0.0.1');
setInterval(() => void tick(), 60000).unref();
void tick();
