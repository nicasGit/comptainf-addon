import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, validateRules } from '../myscheduler/engine.mjs';
import { calendarSnapshot } from '../myscheduler/snapshot.mjs';
const rule = { id: 'weekly', name: 'Semaine salon', source: 'weekly', entity: 'light.salon', priority: 0,
  during: { service: 'light.turn_on', data: { brightness_pct: 60 } }, after: { service: 'light.turn_off', data: {} },
  weekly: { enabled: true, timeZone: 'Europe/Zurich', periods: [{ id: 'week', days: [1, 2, 3], start: '07:00', end: '22:00', mode: 'during' }] } };
const at = value => Date.parse(value + '+01:00');
test('weekly runs Monday Tuesday Wednesday without calendar, and ends at 22:00', () => {
  assert.doesNotThrow(() => validateRules([rule]));
  for (const date of ['2026-11-16', '2026-11-17', '2026-11-18']) {
    assert.equal(plan([], [rule], {}, at(date + 'T07:00:00')).desired['light.salon'].service, 'light.turn_on');
  }
  assert.deepEqual(plan([], [rule], {}, at('2026-11-19T10:00:00')).desired, {});
  const active = plan([], [rule], {}, at('2026-11-16T21:59:00')).active;
  assert.equal(plan([], [rule], active, at('2026-11-16T22:00:00')).desired['light.salon'].service, 'light.turn_off');
  assert.equal(plan([], [{ ...rule, enabled: false }], active, at('2026-11-16T12:00:00')).desired['light.salon'].service, 'light.turn_off');
});
test('calendar failure does not stop weekly or falsely end a stored calendar winner', () => {
  const calendar = { ...rule, source: 'calendar', id: 'calendar', keyword: 'Présence', priority: 10 };
  const event = { id: 'event', summary: 'Présence', start: { dateTime: '2026-11-16T07:00:00+01:00' }, end: { dateTime: '2026-11-16T20:00:00+01:00' } };
  const active = plan([event], [rule, calendar], {}, at('2026-11-16T10:00:00')).active;
  assert.equal(active['light.salon'].id, 'calendar');
  assert.equal(plan([], [rule, calendar], active, at('2026-11-16T11:00:00'), { calendarAvailable: false }).active['light.salon'].id, 'calendar');
  assert.equal(plan([], [rule, calendar], {}, at('2026-11-16T11:00:00'), { calendarAvailable: false }).active['light.salon'].id, 'weekly');
  assert.equal(plan([], [rule, calendar], active, at('2026-11-16T21:00:00')).active['light.salon'].id, 'weekly');
});
test('weekly schedules never fetch Google; calendar failures are explicit', async () => {
  let calls = 0;
  const fetch = async () => { calls++; throw Error('Google offline'); };
  assert.equal((await calendarSnapshot([rule], fetch)).calendarAvailable, true);
  assert.equal(calls, 0);
  const snapshot = await calendarSnapshot([{ ...rule, source: 'calendar' }], fetch);
  assert.equal(snapshot.calendarAvailable, false);
  assert.match(snapshot.warning, /Google offline/);
  assert.equal(calls, 1);
});
test('weekly overnight and missing schedule validation', () => {
  const night = { ...rule, weekly: { ...rule.weekly, periods: [{ id: 'night', days: [1], start: '22:00', end: '07:00', mode: 'during' }] } };
  assert.equal(plan([], [night], {}, at('2026-11-17T06:59:00')).desired['light.salon'].service, 'light.turn_on');
  assert.deepEqual(plan([], [night], {}, at('2026-11-17T07:00:00')).desired, {});
  assert.throws(() => validateRules([{ ...rule, weekly: undefined }]));
  assert.throws(() => validateRules([{ ...rule, weekly: { ...rule.weekly, periods: [] } }]));
});
