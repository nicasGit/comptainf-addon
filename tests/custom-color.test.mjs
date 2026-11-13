import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateColor, matchesColor, colorName } from '../myscheduler/event-colors.mjs';
import { plan, validateRules } from '../myscheduler/engine.mjs';
const rule = { id: 'custom', keyword: 'Test', eventColorId: '#b3dc6c', entity: 'light.salon', priority: 0,
  during: { service: 'light.turn_on', data: {} }, after: { service: 'light.turn_off', data: {} },
  eventMode: 'all_day', allDay: { enabled: true, timeZone: 'Europe/Zurich', periods: [] } };
const event = { id: 'test', summary: 'Test', colorHex: '#b3dc6c', colorSource: 'calendar', start: { date: '2026-11-13' }, end: { date: '2026-11-14' } };
const now = Date.parse('2026-11-13T12:00:00Z');
test('exact displayed hex AND keyword work for inherited and explicit event colors', () => {
  assert.doesNotThrow(() => validateRules([rule]));
  for (const colorSource of ['calendar', 'event']) assert.equal(plan([{ ...event, colorSource }], [rule], {}, now).desired['light.salon'].service, 'light.turn_on');
  for (const e of [{ ...event, colorHex: '#3f51b5' }, { ...event, summary: 'Other' }, { ...event, colorHex: null }]) assert.deepEqual(plan([e], [rule], {}, now).desired, {});
  const active = plan([event], [rule], {}, now).active;
  assert.equal(plan([{ ...event, colorHex: '#3f51b5' }], [rule], active, now).desired['light.salon'].service, 'light.turn_off');
});
test('case-insensitive exact hex, strict validation, and standard semantics unchanged', () => {
  assert.equal(matchesColor({ colorHex: '#B3DC6C' }, '#b3dc6c'), true);
  assert.equal(matchesColor({ colorHex: '#3f51b5', colorSource: 'calendar' }, '9'), false);
  assert.doesNotThrow(() => validateColor('#B3DC6C'));
  assert.equal(colorName('#B3DC6C'), 'Couleur personnalisée #b3dc6c');
  for (const value of ['#', '#abc', 'b3dc6c', '#b3dc6cz', '#GGGGGG']) assert.throws(() => validateColor(value));
});
