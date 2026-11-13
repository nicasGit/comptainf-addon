import { collectEvents } from './calendars.mjs';
import { resolveEventColor } from './event-colors.mjs';

// v0 preserves historical color IDs; v1 exposes new eventLabelId values.
// Complete both reads before returning: unavailable color metadata must not
// falsely end an active rule that filters by color.
export async function collectColoredEvents(ids, list, resource, now = Date.now()) {
  const legacy = await collectEvents(ids, list, now);
  const modern = await collectEvents(ids, (path, query) => list(path, { ...query, eventLabelVersion: '1' }), now);
  const modernById = new Map(modern.map(event => [event.id, event]));
  const calendars = await list('users/me/calendarList');
  const palette = await resource('colors');
  const metadata = new Map();
  for (const id of ids) {
    const calendar = calendars.find(calendar => calendar.id === id || id === 'primary' && calendar.primary) || {};
    const details = await resource(`calendars/${encodeURIComponent(id)}`);
    metadata.set(id, { calendar, labels: details.labelProperties?.eventLabels || [] });
  }
  return legacy.map(event => {
    const current = modernById.get(event.id);
    const combined = { ...event, eventLabelId: current?.eventLabelId || event.eventLabelId || null };
    const { calendar, labels } = metadata.get(event.calendarId);
    return { ...combined, ...resolveEventColor(combined, labels, calendar, palette) };
  });
}
