import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, validateRules } from '../myscheduler/engine.mjs';
import { colorName, matchesColor } from '../myscheduler/event-colors.mjs';
const now = Date.parse('2026-11-13T12:00:00Z');
const rule = { id: 'blue', keyword: 'Présence', eventColorId: '9', entity: 'light.salon', priority: 0,
  eventMode: 'all_day', allDay: { enabled: true, timeZone: 'Europe/Zurich', periods: [] },
  during: { service: 'light.turn_on', data: {} }, after: { service: 'light.turn_off', data: {} } };
const event = { id: 'blue-day', summary: 'PRÉSENCE maison', colorId: '9', start: { date: '2026-11-13' }, end: { date: '2026-11-14' } };
test('keyword AND Myrtille must match and event type remains enforced', () => {
  assert.doesNotThrow(() => validateRules([rule]));
  assert.equal(plan([event], [rule], {}, now).desired['light.salon'].service, 'light.turn_on');
  for (const e of [{ ...event, colorId: '1' }, { ...event, summary: 'Autre chose' }, { ...event, colorId: undefined },
    { ...event, start: { dateTime: '2026-11-13T09:00:00Z' }, end: { dateTime: '2026-11-13T18:00:00Z' } }]) {
    assert.deepEqual(plan([e], [rule], {}, now).desired, {});
  }
});
test('no color filter preserves legacy behavior; inherited color is explicit', () => {
  assert.equal(plan([{ ...event, colorId: undefined }], [{ ...rule, eventColorId: undefined }], {}, now).desired['light.salon'].service, 'light.turn_on');
  assert.equal(matchesColor({ colorId: undefined }, 'default'), true);
  assert.equal(matchesColor({ colorId: '9' }, 'default'), false);
  assert.equal(matchesColor({ colorId: undefined }, '9'), false);
  assert.equal(colorName('9'), 'Myrtille (bleu)');
});
test('changing away from matching color applies final action; validate color IDs', () => {
  const active = plan([event], [rule], {}, now).active;
  assert.equal(plan([{ ...event, colorId: '1' }], [rule], active, now).desired['light.salon'].service, 'light.turn_off');
  for (const id of ['invalid', 9, null]) assert.throws(() => validateRules([{ ...rule, eventColorId: id }]));
});
