import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarIds, collectEvents } from '../myscheduler/calendars.mjs';
import { plan } from '../myscheduler/engine.mjs';

const now = Date.parse('2026-11-13T12:00:00Z');
const event = { id: 'same-id', summary: 'Présence', start: { dateTime: '2026-11-13T11:00:00Z' }, end: { dateTime: '2026-11-13T13:00:00Z' } };
test('migrate legacy single calendar, normalize and validate selections', () => {
  assert.deepEqual(calendarIds({ calendarId: 'personal@example.com' }), ['personal@example.com']);
  assert.deepEqual(calendarIds({}), ['primary']);
  assert.deepEqual(calendarIds({ calendarIds: [' work ', 'personal', 'work'] }), ['work', 'personal']);
  for (const values of [[], [''], [null], 'primary', Array(21).fill('x')]) {
    assert.throws(() => calendarIds({ calendarIds: values }));
  }
});
test('combine calendars, retain origin and distinguish identical event IDs', async () => {
  const calls = [];
  const events = await collectEvents(['home@example.com', 'work'], async (path, query) => {
    calls.push({ path, query });
    return [{ ...event }];
  }, now);
  assert.equal(calls[0].path, 'calendars/home%40example.com/events');
  assert.equal(calls[1].query.singleEvents, 'true');
  assert.deepEqual(events.map(e => e.calendarId).sort(), ['home@example.com', 'work']);
  assert.notEqual(events[0].id, events[1].id);
  const rule = { id: 'presence', keyword: 'Présence', entity: 'climate.salon', temperature: 21, endTemperature: 17, priority: 0 };
  const first = plan(events, [rule], {}, now);
  assert.equal(first.desired['climate.salon'].data.temperature, 21);
  const remaining = events.filter(e => e.id !== first.active['climate.salon'].eventId);
  assert.equal(plan(remaining, [rule], first.active, now).desired['climate.salon'].data.temperature, 21);
  assert.equal(plan([], [rule], first.active, now).desired['climate.salon'].data.temperature, 17);
});
test('failed calendar rejects the entire snapshot instead of producing false end actions', async () => {
  await assert.rejects(collectEvents(['home', 'unavailable'], async path => {
    if (path.includes('unavailable')) throw Error('HTTP 403');
    return [event];
  }, now), /403/);
});
