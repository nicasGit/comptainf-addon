import { validateAction } from './actions.mjs';

const dayMs = 86400000;
const formatters = new Map();
function parts(instant, timeZone) {
  if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }));
  return Object.fromEntries(formatters.get(timeZone).formatToParts(instant).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function wallEpoch(p) { return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second); }
export function shiftDate(date, days) { return new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10); }
const minutes = time => +time.slice(0, 2) * 60 + +time.slice(3);

// Resolve local wall time without relying on the container timezone. For ambiguous
// times use the first occurrence; nonexistent times shift forward by the DST gap.
export function localInstant(date, time, timeZone) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const offsets = new Set();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = wall + hours * 3600000;
    offsets.add(wallEpoch(parts(sample, timeZone)) - sample);
  }
  const candidates = [...offsets].map(offset => wall - offset);
  const exact = candidates.filter(candidate => wallEpoch(parts(candidate, timeZone)) === wall);
  if (exact.length) return Math.min(...exact);
  const forward = candidates.map(candidate => ({ candidate, delta: wallEpoch(parts(candidate, timeZone)) - wall })).filter(p => p.delta >= 0).sort((a, b) => a.delta - b.delta);
  if (!forward.length) throw Error('Heure locale impossible à résoudre.');
  return forward[0].candidate;
}

export function validateSchedule(schedule, entity) {
  if (schedule === undefined) return;
  if (!schedule || typeof schedule.enabled !== 'boolean' || typeof schedule.timeZone !== 'string') throw Error('Configuration des journées invalide.');
  if (!Array.isArray(schedule.periods) || schedule.periods.length > 50) throw Error('Maximum 50 plages horaires par règle.');
  if (!schedule.enabled) return;
  try { new Intl.DateTimeFormat('en', { timeZone: schedule.timeZone }); }
  catch { throw Error('Fuseau horaire invalide, par exemple Europe/Zurich.'); }
  const ids = new Set();
  const segments = [];
  for (const period of schedule.periods) {
    if (!period || typeof period.id !== 'string' || !period.id || ids.has(period.id)) throw Error('Identifiants de plages uniques requis.');
    ids.add(period.id);
    if (!Array.isArray(period.days) || !period.days.length || new Set(period.days).size !== period.days.length || period.days.some(day => !Number.isInteger(day) || day < 1 || day > 7)) throw Error('Choisir au moins un jour par plage.');
    if (![period.start, period.end].every(time => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw Error('Horaires attendus au format HH:MM.');
    if (!['during', 'after', 'custom'].includes(period.mode)) throw Error('Action de plage invalide.');
    if (period.mode === 'custom') validateAction(period.action, entity);
    const start = minutes(period.start);
    let duration = minutes(period.end) - start;
    if (duration <= 0) duration += 1440;
    for (const day of period.days) {
      const begin = (day - 1) * 1440 + start;
      for (const offset of [-10080, 0, 10080]) segments.push({ id: period.id, day, start: begin + offset, end: begin + offset + duration });
    }
  }
  segments.sort((a, b) => a.start - b.start);
  for (let i = 1; i < segments.length; i++) if (segments[i].start < segments[i - 1].end) throw Error('Les plages d’une même règle ne doivent pas se chevaucher, y compris après minuit.');
}

export function eventActivation(event, rule, now) {
  if (event.status === 'cancelled') return null;
  if (event.start?.dateTime && event.end?.dateTime) {
    return Date.parse(event.start.dateTime) <= now && now < Date.parse(event.end.dateTime)
      ? { action: rule.during, eventId: event.id, phase: 'during' } : null;
  }
  const schedule = rule.allDay;
  if (!schedule?.enabled || !event.start?.date || !event.end?.date) return null;
  const start = event.start.date;
  const end = event.end.date; // Google end.date is exclusive.
  const local = parts(now, schedule.timeZone);
  const today = `${local.year}-${local.month}-${local.day}`;
  if (!schedule.periods.length) return start <= today && today < end ? { action: rule.during, eventId: event.id, phase: 'during' } : null;
  // Checking yesterday also covers a night that starts on the final calendar day.
  for (const date of [today, shiftDate(today, -1)]) {
    if (!(start <= date && date < end)) continue;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
    for (const period of schedule.periods) {
      if (!period.days.includes(weekday)) continue;
      const endDate = minutes(period.end) <= minutes(period.start) ? shiftDate(date, 1) : date;
      const from = localInstant(date, period.start, schedule.timeZone);
      const until = localInstant(endDate, period.end, schedule.timeZone);
      if (!(from <= now && now < until)) continue;
      return { action: period.mode === 'custom' ? period.action : rule[period.mode],
        eventId: JSON.stringify([event.id, period.id, date]), phase: 'schedule' };
    }
  }
  return null;
}
