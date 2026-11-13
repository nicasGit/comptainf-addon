import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionSignature, normalizeRule } from '../myscheduler/actions.mjs';
import { plan, validateRules } from '../myscheduler/engine.mjs';
import { createHomeAssistant, servicesForEntity } from '../myscheduler/home-assistant.mjs';
import { snapshot } from './fixtures/ha.mjs';

const now = Date.parse('2026-11-13T12:00:00Z');
const event = { id: 'event', summary: 'Présence', start: { dateTime: '2026-11-13T11:00:00Z' }, end: { dateTime: '2026-11-13T13:00:00Z' } };
const rule = { id: 'light', keyword: 'Présence', entity: 'light.salon', priority: 0,
  during: { service: 'light.turn_on', data: { brightness_pct: 65, rgb_color: [255, 180, 100] } },
  after: { service: 'light.turn_off', data: {} } };

test('generic actions preserve parameters, final action and priority handover', () => {
  const rules = validateRules([rule]);
  const started = plan([event], rules, {}, now);
  assert.equal(started.desired['light.salon'].service, 'light.turn_on');
  assert.deepEqual(started.desired['light.salon'].data, rule.during.data);
  const ended = plan([], rules, started.active, now);
  assert.equal(ended.desired['light.salon'].service, 'light.turn_off');
  assert.equal(ended.desired['light.salon'].phase, 'after');
  const higher = { ...rule, id: 'higher', priority: 10, during: { service: 'light.turn_off', data: {} } };
  assert.equal(plan([event], [higher, rule], started.active, now).desired['light.salon'].service, 'light.turn_off');
});
test('legacy thermostat rules and active state retain their end temperature', () => {
  const legacy = { id: 'old', keyword: 'Présence', entity: 'climate.salon', priority: 0, temperature: 21, endTemperature: 17 };
  assert.equal(normalizeRule(legacy).during.service, 'climate.set_temperature');
  assert.deepEqual(plan([], [], { 'climate.salon': { ...legacy, eventId: 'old-event' } }, now).desired['climate.salon'].data, { temperature: 17 });
});
test('reject malformed services, cross-domain actions and overridden targets', () => {
  for (const during of [
    { service: '../restart', data: {} }, { service: 'switch.turn_on', data: {} },
    { service: 'light.turn_on', data: { entity_id: 'all' } },
    { service: 'light.turn_on', data: { area_id: 'all' } },
    { service: 'light.turn_on', data: [] }
  ]) assert.throws(() => validateRules([{ ...rule, during }]));
});
test('action signatures ignore parameter order but distinguish event occurrences', () => {
  const action = { entity: 'light.salon', service: 'light.turn_on', data: { brightness_pct: 50, transition: 2 }, eventId: 'one', phase: 'during' };
  assert.equal(actionSignature(action), actionSignature({ ...action, data: { transition: 2, brightness_pct: 50 } }));
  assert.notEqual(actionSignature(action), actionSignature({ ...action, eventId: 'two' }));
});
test('entity service catalog filters domains, capabilities and global operations', () => {
  const services = servicesForEntity(snapshot.entities[0], snapshot.services);
  assert.ok(services.some(s => s.id === 'climate.set_temperature'));
  assert.ok(!services.some(s => ['climate.unsupported', 'homeassistant.restart', 'light.turn_on'].includes(s.id)));
  assert.deepEqual(servicesForEntity(snapshot.entities[3], snapshot.services), []);
});
test('discovery and action execution use HA API and the chosen entity', async () => {
  const calls = [];
  const ha = createHomeAssistant('test-token', async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/states')) return snapshot.entities;
    if (url.endsWith('/services')) return snapshot.services;
    return [];
  });
  const catalog = await ha.catalog();
  await ha.execute({ entity: rule.entity, ...rule.during }, catalog);
  assert.equal(calls[2].url, 'http://supervisor/core/api/services/light/turn_on');
  assert.deepEqual(JSON.parse(calls[2].options.body), { ...rule.during.data, entity_id: 'light.salon' });
  assert.equal(calls[2].options.headers.Authorization, 'Bearer test-token');
  await assert.rejects(ha.execute({ entity: 'sensor.temperature', service: 'sensor.set_value', data: {} }, catalog), /indisponible/);
  await assert.rejects(ha.execute({ entity: 'light.missing', ...rule.during }, catalog), /absente/);
  await assert.rejects(createHomeAssistant('', async () => {}).catalog(), /HAOS/);
});
