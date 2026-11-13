import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventColor, matchesColor, validHex } from '../myscheduler/event-colors.mjs';
import { collectColoredEvents } from '../myscheduler/colored-events.mjs';
const palette = { event: { '9': { background: '#5484ed' } }, calendar: { '1': { background: '#abc123' } } };
test('show inherited calendar color without treating it as an explicit event color', () => {
  const resolved = resolveEventColor({}, [], { backgroundColor: '#3F51B5' }, palette);
  assert.equal(resolved.colorHex, '#3f51b5');
  assert.match(resolved.colorLabel, /Myrtille.*héritée/);
  assert.equal(resolved.colorSource, 'calendar');
  assert.equal(matchesColor(resolved, '9'), false);
  assert.equal(matchesColor(resolved, 'default'), true);
});
test('new Google label resolves Myrtille and participates in keyword/color filtering', () => {
  const event = { eventLabelId: 'modern-blue' };
  const resolved = resolveEventColor(event, [{ id: 'modern-blue', backgroundColor: '#3f51b5', name: 'Blueberry' }], {}, palette);
  assert.equal(resolved.resolvedColorId, '9');
  assert.equal(resolved.colorSource, 'event');
  assert.equal(matchesColor({ ...event, ...resolved }, '9'), true);
  assert.equal(matchesColor({ ...event, ...resolved }, 'default'), false);
});
test('legacy palette, custom labels and unknown colors remain distinguishable', () => {
  assert.equal(resolveEventColor({ colorId: '9' }, [], {}, palette).colorHex, '#5484ed');
  const custom = resolveEventColor({ eventLabelId: 'custom' }, [{ id: 'custom', name: 'Baptiste', backgroundColor: '#123456' }], {}, palette);
  assert.equal(custom.colorLabel, 'Baptiste');
  assert.equal(custom.resolvedColorId, null);
  assert.equal(resolveEventColor({}, [], {}, {}).colorSource, 'unknown');
  assert.equal(validHex('red;background:url(test)'), null);
});
test('merge legacy and modern event reads with calendar metadata', async () => {
  let modernRead = false;
  const event = { id: 'event', summary: 'Baptiste', start: { date: '2026-11-13' }, end: { date: '2026-11-14' } };
  const list = async (path, query) => {
    if (path === 'users/me/calendarList') return [{ id: 'owner@example.com', primary: true, summary: 'Calendrier personnel', backgroundColor: '#3f51b5' }];
    if (query.eventLabelVersion === '1') { modernRead = true; return [{ ...event, eventLabelId: 'blue' }]; }
    return [event];
  };
  const resource = async path => path === 'colors' ? palette : { labelProperties: { eventLabels: [{ id: 'blue', name: 'Blueberry', backgroundColor: '#3f51b5' }] } };
  const events = await collectColoredEvents(['primary'], list, resource, Date.parse('2026-11-13T12:00:00Z'));
  assert.equal(modernRead, true);
  assert.equal(events[0].colorLabel, 'Myrtille (bleu)');
  assert.equal(events[0].colorSource, 'event');
  assert.equal(events[0].resolvedColorId, '9');
  assert.equal(events[0].calendarName, 'Calendrier personnel');
  await assert.rejects(collectColoredEvents(['primary'], list, async () => { throw Error('Metadata unavailable'); }), /Metadata unavailable/);
});
test('calendar names prefer personal alias, then shared name, then resource name', async () => {
  const id = '47r4o@group.calendar.google.com';
  for (const [entry, details, expected] of [
    [{ id, summary: 'Famille', summaryOverride: 'Mon calendrier partagé' }, { summary: 'Original' }, 'Mon calendrier partagé'],
    [{ id, summary: 'Famille' }, { summary: 'Original' }, 'Famille'],
    [{ id }, { summary: 'Original' }, 'Original']
  ]) {
    const list = async path => path === 'users/me/calendarList' ? [entry] : [{ id: 'event', summary: 'Test' }];
    const resource = async path => path === 'colors' ? {} : details;
    const result = await collectColoredEvents([id], list, resource);
    assert.equal(result[0].calendarName, expected);
    assert.equal(result[0].calendarId, id);
  }
});
