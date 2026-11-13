const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const reserved = new Set(['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id', 'target']);

export function normalizeRule(rule) {
  if (rule.during || rule.after) return { ...rule };
  const { temperature, endTemperature, ...rest } = rule;
  if (!Number.isFinite(temperature) || !Number.isFinite(endTemperature) ||
      temperature < 5 || temperature > 35 || endTemperature < 5 || endTemperature > 35 ||
      !rest.entity?.startsWith('climate.')) throw Error('Ancienne règle de température invalide.');
  return { ...rest,
    during: { service: 'climate.set_temperature', data: { temperature } },
    after: { service: 'climate.set_temperature', data: { temperature: endTemperature } }
  };
}

export function validateAction(action, entity) {
  if (!object(action) || typeof action.service !== 'string' || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(action.service)) throw Error('Choisir une action pendant et après.');
  const domain = entity.split('.')[0];
  if (![domain, 'homeassistant'].includes(action.service.split('.')[0])) throw Error('L’action doit correspondre au domaine de l’entité.');
  if (!object(action.data) || Object.keys(action.data).some(key => reserved.has(key) || ['__proto__', 'constructor', 'prototype'].includes(key))) throw Error('Paramètres invalides : la cible est définie par l’entité choisie.');
  if (JSON.stringify(action.data).length > 16000) throw Error('Paramètres trop volumineux.');
  return action;
}

export function command(entity, action, eventId, phase) {
  validateAction(action, entity);
  return { entity, service: action.service, data: action.data, eventId, phase };
}

export function actionSignature(action) {
  function ordered(value) {
    if (Array.isArray(value)) return value.map(ordered);
    if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
    return value;
  }
  return JSON.stringify(ordered(action));
}
