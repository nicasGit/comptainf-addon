import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, validateRules } from '../myscheduler/engine.mjs';
import { eventMode } from '../myscheduler/actions.mjs';
const rule = { id: 'mode', keyword: 'Présence', entity: 'light.salon', priority: 0,
  during: { service: 'light.turn_on', data: {} }, after: { service: 'light.turn_off', data: {} },
  allDay: { enabled: true, timeZone: 'Europe/Zurich', periods: [] } };
const timed = { id: 'timed', summary: 'Présence', start: { dateTime: '2026-11-13T09:00:00Z' }, end: { dateTime: '2026-11-13T18:00:00Z' } };
const full = { id: 'full', summary: 'Présence', start: { date: '2026-11-13' }, end: { date: '2026-11-14' } };
const now = Date.parse('2026-11-13T12:00:00Z');
test('event type selects timed only, all-day only or both', () => {
  for (const [mode, acceptsTimed, acceptsFull] of [['timed', true, false], ['all_day', false, true], ['both', true, true]]) {
    const selected = { ...rule, eventMode: mode };
    assert.doesNotThrow(() => validateRules([selected]));
    assert.equal(Boolean(plan([timed], [selected], {}, now).active['light.salon']), acceptsTimed);
    assert.equal(Boolean(plan([full], [selected], {}, now).active['light.salon']), acceptsFull);
  }
});
test('legacy mode is preserved; invalid combinations rejected', () => {
  assert.equal(eventMode(rule), 'both');
  assert.equal(eventMode({ ...rule, allDay: undefined }), 'timed');
  assert.throws(() => validateRules([{ ...rule, eventMode: 'invalid' }]));
  assert.throws(() => validateRules([{ ...rule, eventMode: 'all_day', allDay: undefined }]));
  const current = plan([timed], [rule], {}, now).active;
  assert.equal(plan([timed], [{ ...rule, eventMode: 'all_day' }], current, now).desired['light.salon'].service, 'light.turn_off');
});
