import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localInstant } from '../myscheduler/schedule.mjs';
import { plan, validateRules } from '../myscheduler/engine.mjs';

const zone = 'Europe/Zurich';
const at = (date, time) => localInstant(date, time, zone);
const period = (id, days, start, end, mode, action) => ({ id, days, start, end, mode, ...(action ? { action } : {}) });
const rule = {
  id: 'heating', keyword: 'Présence', entity: 'climate.salon', priority: 0,
  during: { service: 'climate.set_temperature', data: { temperature: 21 } },
  after: { service: 'climate.set_temperature', data: { temperature: 17 } },
  allDay: { enabled: true, timeZone: zone, periods: [
    period('friday', [5], '19:00', '22:00', 'during'),
    period('weekend', [6, 7], '07:00', '22:00', 'during'),
    period('night', [5, 6], '22:00', '07:00', 'after'),
    period('wednesday', [3], '07:00', '00:00', 'custom', { service: 'climate.set_hvac_mode', data: { hvac_mode: 'off' } })
  ] }
};
const event = { id: 'stay', summary: 'Présence maison', start: { date: '2026-11-13' }, end: { date: '2026-11-19' } };
const desired = (date, time, events = [event], previous = {}) => plan(events, [rule], previous, at(date, time));

test('Friday start/end and weekend heating and overnight reduction', () => {
  assert.doesNotThrow(() => validateRules([rule]));
  assert.deepEqual(desired('2026-11-13', '18:59').desired, {});
  for (const [date, time, temperature] of [
    ['2026-11-13', '19:00', 21], ['2026-11-13', '21:59', 21], ['2026-11-13', '22:00', 17],
    ['2026-11-14', '06:59', 17], ['2026-11-14', '07:00', 21], ['2026-11-14', '22:00', 17],
    ['2026-11-15', '06:59', 17], ['2026-11-15', '07:00', 21], ['2026-11-15', '21:59', 21]
  ]) assert.equal(desired(date, time).desired['climate.salon'].data.temperature, temperature, `${date} ${time}`);
  const sunday = desired('2026-11-15', '21:59');
  assert.equal(desired('2026-11-15', '22:00', [event], sunday.active).desired['climate.salon'].data.temperature, 17);
});
test('Wednesday custom off action begins at 07:00 only with matching calendar event', () => {
  assert.deepEqual(desired('2026-11-18', '06:59').desired, {});
  const command = desired('2026-11-18', '07:00').desired['climate.salon'];
  assert.equal(command.service, 'climate.set_hvac_mode');
  assert.deepEqual(command.data, { hvac_mode: 'off' });
  assert.deepEqual(desired('2026-11-18', '07:00', []).desired, {});
  assert.deepEqual(desired('2026-11-18', '07:00', [{ ...event, summary: 'Autre chose' }]).desired, {});
  assert.deepEqual(desired('2026-11-18', '07:00', [{ ...event, status: 'cancelled' }]).desired, {});
});
test('a one-day Friday event can finish its overnight slot on Saturday', () => {
  const friday = { ...event, end: { date: '2026-11-14' } };
  assert.equal(desired('2026-11-14', '06:59', [friday]).desired['climate.salon'].data.temperature, 17);
  assert.deepEqual(desired('2026-11-14', '07:00', [friday]).desired, {});
  assert.deepEqual(desired('2026-11-14', '12:00', [friday]).desired, {});
});
test('all-day without slots respects local midnight and exclusive end.date', () => {
  const full = { ...rule, allDay: { enabled: true, timeZone: zone, periods: [] } };
  const oneDay = { ...event, end: { date: '2026-11-14' } };
  assert.deepEqual(plan([oneDay], [full], {}, at('2026-11-12', '23:59')).desired, {});
  assert.equal(plan([oneDay], [full], {}, at('2026-11-13', '00:00')).desired['climate.salon'].data.temperature, 21);
  assert.deepEqual(plan([oneDay], [full], {}, at('2026-11-14', '00:00')).desired, {});
});
test('explicit timezone and daylight-saving transitions resolve consistently', () => {
  assert.equal(new Date(at('2026-11-13', '19:00')).toISOString(), '2026-11-13T18:00:00.000Z');
  assert.equal(new Date(at('2026-03-29', '02:30')).toISOString(), '2026-03-29T01:30:00.000Z');
  assert.equal(new Date(at('2026-10-25', '02:30')).toISOString(), '2026-10-25T00:30:00.000Z');
  const night = { ...rule, allDay: { enabled: true, timeZone: zone, periods: [period('night', [6], '22:00', '07:00', 'during')] } };
  const spring = { ...event, start: { date: '2026-03-28' }, end: { date: '2026-03-29' } };
  assert.equal(plan([spring], [night], {}, Date.parse('2026-03-29T04:59:00Z')).desired['climate.salon'].data.temperature, 21);
  assert.deepEqual(plan([spring], [night], {}, Date.parse('2026-03-29T05:00:00Z')).desired, {});
});
test('resume after restart, rule priority and timed events remain compatible', () => {
  const friday = desired('2026-11-13', '21:59');
  const restored = JSON.parse(JSON.stringify(friday.active));
  assert.equal(desired('2026-11-13', '22:00', [event], restored).desired['climate.salon'].data.temperature, 17);
  const higher = { ...rule, id: 'priority', priority: 10, during: { service: 'climate.set_temperature', data: { temperature: 24 } } };
  assert.equal(plan([event], [rule, higher], {}, at('2026-11-13', '19:30')).desired['climate.salon'].data.temperature, 24);
  const timed = { ...event, start: { dateTime: '2026-11-13T10:00:00+01:00' }, end: { dateTime: '2026-11-13T11:00:00+01:00' } };
  assert.equal(plan([timed], [rule], {}, at('2026-11-13', '10:30')).desired['climate.salon'].data.temperature, 21);
});
test('invalid zones, weekdays, custom actions and overlaps including week wrap are rejected', () => {
  const base = rule.allDay;
  for (const allDay of [
    { ...base, timeZone: 'Invalid/Zone' },
    { ...base, periods: [period('bad', [], '07:00', '22:00', 'during')] },
    { ...base, periods: [period('bad', [1], '25:00', '22:00', 'during')] },
    { ...base, periods: [period('bad', [3], '07:00', '22:00', 'custom', { service: 'light.turn_off', data: {} })] },
    { ...base, periods: [period('a', [5], '22:00', '07:00', 'during'), period('b', [6], '06:00', '08:00', 'after')] },
    { ...base, periods: [period('a', [7], '22:00', '07:00', 'during'), period('b', [1], '06:00', '08:00', 'after')] }
  ]) assert.throws(() => validateRules([{ ...rule, allDay }]));
});
