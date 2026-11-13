import { validateAction } from './actions.mjs';

function matchesFilter(entity, filter = {}) {
  const domain = entity.entity_id.split('.')[0];
  const domains = Array.isArray(filter.domain) ? filter.domain : [filter.domain];
  if (filter.domain && !domains.includes(domain)) return false;
  const classes = Array.isArray(filter.device_class) ? filter.device_class : [filter.device_class];
  if (filter.device_class && !classes.includes(entity.attributes?.device_class)) return false;
  const features = filter.supported_features;
  if (features !== undefined) {
    const flags = Array.isArray(features) ? features : [features];
    const supported = Number(entity.attributes?.supported_features || 0);
    if (!flags.some(flag => (supported & flag) === flag)) return false;
  }
  return true;
}

export function servicesForEntity(entity, domains) {
  if (!entity) return [];
  const ownDomain = entity.entity_id.split('.')[0];
  const result = [];
  for (const entry of domains) {
    if (![ownDomain, 'homeassistant'].includes(entry.domain)) continue;
    for (const [name, info] of Object.entries(entry.services || {})) {
      if ((!info.target && !info.fields?.entity_id) || info.response?.optional === false) continue;
      const filters = info.target?.entity;
      if (filters && !(Array.isArray(filters) ? filters : [filters]).some(filter => matchesFilter(entity, filter))) continue;
      result.push({ ...info, id: `${entry.domain}.${name}`, fields: Object.fromEntries(
        Object.entries(info.fields || {}).filter(([key]) => !['entity_id', 'device_id', 'area_id', 'floor_id', 'label_id', 'target'].includes(key))
      ) });
    }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

export function createHomeAssistant(token, request) {
  async function call(path, options = {}) {
    if (!token) throw Error('Accès Home Assistant indisponible : exécuter l’add-on dans HAOS.');
    return request(`http://supervisor/core/api/${path}`, {
      ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
  }
  async function catalog() {
    const [entities, services] = await Promise.all([call('states'), call('services')]);
    return { entities: entities.map(({ entity_id, state, attributes }) => ({ entity_id, state, attributes })), services };
  }
  async function execute(action, snapshot) {
    validateAction(action, action.entity);
    const entity = snapshot.entities.find(entity => entity.entity_id === action.entity);
    if (!entity || entity.state === 'unavailable') throw Error(`Entité absente ou indisponible : ${action.entity}`);
    const service = servicesForEntity(entity, snapshot.services).find(service => service.id === action.service);
    if (!service) throw Error(`Action indisponible pour ${action.entity} : ${action.service}`);
    const [domain, name] = action.service.split('.');
    return call(`services/${domain}/${name}`, { method: 'POST', body: JSON.stringify({ ...action.data, entity_id: action.entity }) });
  }
  return { catalog, execute };
}
