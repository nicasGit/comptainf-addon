export function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length > 100) throw Error('Maximum 100 règles.');
  const ids = new Set();
  for (const r of rules) {
    if (!r.id || typeof r.id !== 'string' || ids.has(r.id)) throw Error('Identifiants de règles uniques requis.');
    ids.add(r.id);
    if (typeof r.keyword !== 'string' || !r.keyword.trim()) throw Error('Mot-clé requis.');
    if (typeof r.entity !== 'string' || !/^climate\.[a-z0-9_]+$/.test(r.entity)) throw Error('Entité climate invalide.');
    for (const key of ['temperature', 'endTemperature']) {
      if (!Number.isFinite(r[key]) || r[key] < 5 || r[key] > 35) throw Error('Températures entre 5 et 35 °C.');
    }
    if (!Number.isInteger(r.priority) || Math.abs(r.priority) > 1000) throw Error('Priorité entière entre -1000 et 1000.');
  }
  return rules;
}

// All-day events are deliberately excluded in v1: no implicit timezone conversion.
export function plan(events, rules, previous = {}, now = Date.now()) {
  const candidates = {};
  for (const event of events) {
    if (event.status === 'cancelled' || !event.start?.dateTime || !event.end?.dateTime) continue;
    if (!(Date.parse(event.start.dateTime) <= now && now < Date.parse(event.end.dateTime))) continue;
    for (const rule of rules) {
      if (!String(event.summary || '').toLocaleLowerCase('fr').includes(rule.keyword.trim().toLocaleLowerCase('fr'))) continue;
      (candidates[rule.entity] ||= []).push({ ...rule, eventId: event.id });
    }
  }
  const active = {};
  const desired = {};
  for (const [entity, matches] of Object.entries(candidates)) {
    matches.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id) || a.eventId.localeCompare(b.eventId));
    active[entity] = matches[0];
    desired[entity] = matches[0].temperature;
  }
  for (const [entity, rule] of Object.entries(previous)) {
    if (!active[entity]) desired[entity] = rule.endTemperature;
  }
  return { active, desired };
}
