import { normalizeRule, validateAction, command } from './actions.mjs';
import { validateSchedule, eventActivation } from './schedule.mjs';

export function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length > 100) throw Error('Maximum 100 règles.');
  const ids = new Set();
  return rules.map(input => {
    const r = normalizeRule(input);
    if (!r.id || typeof r.id !== 'string' || ids.has(r.id)) throw Error('Identifiants de règles uniques requis.');
    ids.add(r.id);
    if (typeof r.keyword !== 'string' || !r.keyword.trim()) throw Error('Mot-clé requis.');
    if (typeof r.entity !== 'string' || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(r.entity)) throw Error('Entité Home Assistant invalide.');
    validateAction(r.during, r.entity);
    validateAction(r.after, r.entity);
    validateSchedule(r.allDay, r.entity);
    if (!Number.isInteger(r.priority) || Math.abs(r.priority) > 1000) throw Error('Priorité entière entre -1000 et 1000.');
    return r;
  });
}

// Timed events retain their hours; all-day events use the rule's local schedule.
export function plan(events, rules, previous = {}, now = Date.now()) {
  const candidates = {};
  const normalized = rules.map(normalizeRule);
  for (const event of events) {
    for (const rule of normalized) {
      if (!String(event.summary || '').toLocaleLowerCase('fr').includes(rule.keyword.trim().toLocaleLowerCase('fr'))) continue;
      const activation = eventActivation(event, rule, now);
      if (!activation) continue;
      (candidates[rule.entity] ||= []).push({ ...rule, eventId: activation.eventId, currentAction: activation.action, phase: activation.phase });
    }
  }
  const active = {};
  const desired = {};
  for (const [entity, matches] of Object.entries(candidates)) {
    matches.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id) || a.eventId.localeCompare(b.eventId));
    active[entity] = matches[0];
    desired[entity] = command(entity, matches[0].currentAction, matches[0].eventId, matches[0].phase);
  }
  for (const [entity, input] of Object.entries(previous)) {
    const rule = normalizeRule(input);
    if (!active[entity]) desired[entity] = command(entity, rule.after, rule.eventId, 'after');
  }
  return { active, desired };
}
