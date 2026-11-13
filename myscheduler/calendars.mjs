export function calendarIds(config) {
  const values = config.calendarIds === undefined ? [config.calendarId || 'primary'] : config.calendarIds;
  if (!Array.isArray(values) || values.length === 0 || values.length > 20 ||
      values.some(id => typeof id !== 'string' || !id.trim() || id.length > 1024)) {
    throw Error('Sélectionner entre 1 et 20 calendriers valides.');
  }
  return [...new Set(values.map(id => id.trim()))];
}

// Only return a complete snapshot: one failed calendar must never end other rules.
export async function collectEvents(ids, list, now = Date.now()) {
  const query = {
    singleEvents: 'true', orderBy: 'startTime', maxResults: '2500',
    timeMin: new Date(now - 86400000).toISOString(),
    timeMax: new Date(now + 7 * 86400000).toISOString()
  };
  const events = [];
  for (const calendarId of ids) {
    const items = await list(`calendars/${encodeURIComponent(calendarId)}/events`, query);
    events.push(...items.map(event => ({ ...event, calendarId, id: JSON.stringify([calendarId, event.id]) })));
  }
  return events.sort((a, b) => Date.parse(a.start?.dateTime || a.start?.date) - Date.parse(b.start?.dateTime || b.start?.date) || a.id.localeCompare(b.id));
}
