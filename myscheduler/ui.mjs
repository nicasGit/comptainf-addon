import { servicesForEntity } from './home-assistant.mjs';

const $ = id => document.getElementById(id);
let csrf;
let selectedCalendars = new Set(['primary']);
let availableCalendars = [];
let catalog = { entities: [], services: [] };
let rules = [];
let ruleSequence = 0;

function createRuleId() {
  const api = globalThis.crypto;
  if (typeof api?.randomUUID === 'function') return api.randomUUID();
  if (typeof api?.getRandomValues === 'function') return Array.from(api.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
  return `rule-${Date.now().toString(36)}-${++ruleSequence}-${Math.random().toString(36).slice(2)}`;
}
function notice(message) { $('notice').textContent = message; }
async function api(path, data) {
  const response = await fetch(`api/${path}`, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Erreur de connexion');
  return result;
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function option(select, value, label) {
  const node = element('option', label); node.value = value; select.append(node);
}
function labeled(parent, text, input) {
  const label = element('label', text); label.append(input); parent.append(label); return input;
}
function renderCalendars() {
  const choices = new Map(availableCalendars.map(c => [c.id, c.summary || c.id]));
  for (const id of selectedCalendars) if (!choices.has(id)) choices.set(id, id === 'primary' ? 'Calendrier principal' : id);
  $('calendars').replaceChildren();
  for (const [id, name] of choices) {
    const label = element('label'); const input = element('input'); input.type = 'checkbox'; input.checked = selectedCalendars.has(id);
    input.onchange = () => { if (input.checked) selectedCalendars.add(id); else selectedCalendars.delete(id); };
    label.append(input, document.createTextNode(` ${name}`)); $('calendars').append(label);
  }
}
function renderStatus(status) {
  notice(status.message);
  $('syncTime').textContent = status.lastSync ? `Dernière synchronisation : ${new Date(status.lastSync).toLocaleString()}` : 'Pas encore synchronisé';
  $('actions').textContent = status.actions.map(a => `${a.entity} → ${a.service} ${JSON.stringify(a.data)} (${a.phase === 'after' ? 'après' : 'pendant'})`).join('\n') || 'Aucune action';
  $('events').textContent = status.events.map(e => {
    const calendar = availableCalendars.find(c => c.id === e.calendarId);
    return `${new Date(e.start).toLocaleString()} → ${new Date(e.end).toLocaleString()} · [${calendar?.summary || e.calendarId || 'Calendrier'}] ${e.title}`;
  }).join('\n') || 'Aucun événement';
}

const fieldNames = {
  temperature: 'Température', target_temp_low: 'Température basse', target_temp_high: 'Température haute',
  hvac_mode: 'Mode de chauffage', preset_mode: 'Préréglage', fan_mode: 'Mode ventilation', swing_mode: 'Oscillation',
  brightness: 'Luminosité (0–255)', brightness_pct: 'Luminosité (%)', transition: 'Transition (secondes)',
  percentage: 'Vitesse (%)', position: 'Position (%)', volume_level: 'Volume (0–1)',
  value: 'Valeur', option: 'Option', source: 'Source', rgb_color: 'Couleur RVB', color_temp_kelvin: 'Température de couleur (K)'
};
function fieldOptions(key, field, entity) {
  const attributes = entity?.attributes || {};
  const attribute = { hvac_mode: 'hvac_modes', preset_mode: 'preset_modes', fan_mode: 'fan_modes', swing_mode: 'swing_modes',
    option: 'options', source: 'source_list', sound_mode: 'sound_mode_list' }[key];
  if (attribute && Array.isArray(attributes[attribute])) return attributes[attribute];
  return field.selector?.select?.options;
}
function fieldControl(key, field, entity, value, change) {
  const selector = field.selector || {};
  const choices = fieldOptions(key, field, entity);
  let input;
  let kind = 'text';
  if (Array.isArray(choices) && !selector.select?.multiple) {
    input = element('select'); option(input, '', 'Non renseigné');
    for (const choice of choices) option(input, typeof choice === 'object' ? choice.value : choice, typeof choice === 'object' ? choice.label || choice.value : choice);
    if (value !== undefined && ![...input.options].some(o => o.value === String(value))) option(input, String(value), `${value} (valeur enregistrée)`);
    input.value = value === undefined ? '' : String(value);
    if (choices.some(choice => typeof (typeof choice === 'object' ? choice.value : choice) === 'number')) kind = 'number';
  } else if (Object.hasOwn(selector, 'boolean')) {
    input = element('select'); option(input, '', 'Non renseigné'); option(input, 'true', 'Oui'); option(input, 'false', 'Non');
    input.value = value === undefined ? '' : String(value); kind = 'boolean';
  } else if (selector.number || ['temperature', 'target_temp_low', 'target_temp_high', 'brightness', 'brightness_pct', 'percentage', 'position', 'volume_level', 'value', 'transition'].includes(key) && typeof value !== 'string' && !selector.text) {
    input = element('input'); input.type = 'number'; kind = 'number';
    const bounds = { ...selector.number };
    if (key === 'temperature' || key.startsWith('target_temp_')) {
      bounds.min = entity?.attributes?.min_temp ?? bounds.min;
      bounds.max = entity?.attributes?.max_temp ?? bounds.max;
      bounds.step = entity?.attributes?.target_temp_step ?? bounds.step;
    } else if (key === 'value') {
      bounds.min = entity?.attributes?.min ?? bounds.min;
      bounds.max = entity?.attributes?.max ?? bounds.max;
      bounds.step = entity?.attributes?.step ?? bounds.step;
    }
    for (const prop of ['min', 'max']) if (bounds[prop] !== undefined) input[prop] = bounds[prop];
    input.step = bounds.step || 'any'; input.value = value ?? '';
  } else if (selector.object || selector.select?.multiple || selector.rgb_color || selector.color_rgb || selector.duration || selector.target || Array.isArray(value) || value !== null && typeof value === 'object') {
    input = element('textarea'); kind = 'json'; input.rows = 2; input.placeholder = 'Valeur JSON'; input.value = value === undefined ? '' : JSON.stringify(value);
  } else {
    input = element('input'); input.type = 'text'; input.value = value ?? '';
  }
  input.dataset.parameter = key;
  input.oninput = () => {
    try {
      const raw = input.value;
      const result = raw === '' ? undefined : kind === 'number' ? Number(raw) : kind === 'boolean' ? raw === 'true' : kind === 'json' ? JSON.parse(raw) : raw;
      if (kind === 'number' && raw !== '' && !Number.isFinite(result)) throw Error('Nombre invalide');
      input.setCustomValidity(''); change(result);
    } catch { input.setCustomValidity('Valeur JSON ou numérique invalide.'); }
  };
  return input;
}
function renderAction(parent, rule, phase) {
  const box = element('fieldset'); box.append(element('legend', phase === 'during' ? 'Pendant l’événement' : 'Après l’événement'));
  parent.append(box);
  const entity = catalog.entities.find(e => e.entity_id === rule.entity);
  const services = servicesForEntity(entity, catalog.services);
  const action = rule[phase];
  const select = element('select'); option(select, '', 'Choisir une action');
  for (const service of services) option(select, service.id, service.name ? `${service.name} · ${service.id}` : service.id);
  if (action.service && !services.some(s => s.id === action.service)) option(select, action.service, `${action.service} (enregistrée, disponibilité à vérifier)`);
  select.value = action.service; select.required = true;
  labeled(box, 'Action', select);
  select.onchange = () => { rule[phase] = { service: select.value, data: {} }; renderRules(); };
  if (!action.service) {
    box.append(element('p', services.length ? 'Choisis une action pour afficher ses paramètres.' : 'Choisis une entité commandable et charge les entités Home Assistant. Les capteurs en lecture seule n’ont pas de paramètres modifiables.'));
    return;
  }
  const metadata = services.find(s => s.id === action.service);
  const fields = metadata?.fields || {};
  for (const [key, field] of Object.entries(fields)) {
    const control = fieldControl(key, field, entity, action.data[key], value => {
      if (value === undefined) delete action.data[key]; else action.data[key] = value;
    });
    control.required = Boolean(field.required);
    const unit = field.selector?.number?.unit_of_measurement;
    labeled(box, `${field.name || fieldNames[key] || key}${unit ? ` (${unit})` : ''}${field.required ? ' *' : ''}`, control);
    if (field.description) box.append(element('small', field.description));
  }
  if (metadata && !Object.keys(fields).length) box.append(element('p', 'Cette action ne demande aucun paramètre.'));
  const details = element('details'); details.append(element('summary', 'Paramètres avancés (JSON)'));
  const extra = Object.fromEntries(Object.entries(action.data).filter(([key]) => !Object.hasOwn(fields, key)));
  const json = element('textarea'); json.rows = 3; json.value = JSON.stringify(extra, null, 2);
  json.oninput = () => {
    try {
      const data = JSON.parse(json.value || '{}');
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
      if (Object.keys(data).some(key => Object.hasOwn(fields, key))) throw Error();
      const known = Object.fromEntries(Object.entries(action.data).filter(([key]) => Object.hasOwn(fields, key)));
      action.data = { ...known, ...data }; json.setCustomValidity('');
    } catch { json.setCustomValidity('Objet JSON requis, sans les paramètres déjà affichés au-dessus.'); }
  };
  labeled(details, 'Paramètres supplémentaires uniquement', json); box.append(details);
}
function renderRules() {
  $('rules').replaceChildren();
  for (const rule of rules) {
    const row = element('div', undefined, 'rule');
    const keyword = element('input'); keyword.value = rule.keyword; keyword.required = true; keyword.oninput = () => { rule.keyword = keyword.value; };
    labeled(row, 'Mot-clé du titre', keyword);
    const priority = element('input'); priority.type = 'number'; priority.step = '1'; priority.min = '-1000'; priority.max = '1000'; priority.value = rule.priority; priority.required = true;
    priority.oninput = () => { rule.priority = Number(priority.value); }; labeled(row, 'Priorité', priority);
    const entityBox = element('div', undefined, 'wide');
    const search = element('input'); search.type = 'search'; search.placeholder = 'Rechercher par nom ou identifiant';
    labeled(entityBox, 'Rechercher une entité', search);
    const select = element('select'); select.required = true;
    function choices() {
      select.replaceChildren(); option(select, '', 'Choisir une entité');
      const needle = search.value.toLocaleLowerCase('fr');
      const matches = catalog.entities.filter(e => e.entity_id === rule.entity || `${e.entity_id} ${e.attributes?.friendly_name || ''}`.toLocaleLowerCase('fr').includes(needle));
      for (const e of matches) option(select, e.entity_id, `${e.attributes?.friendly_name || e.entity_id} · ${e.entity_id}${e.state === 'unavailable' ? ' (indisponible)' : ''}`);
      if (rule.entity && !matches.some(e => e.entity_id === rule.entity)) option(select, rule.entity, `${rule.entity} (enregistrée)`);
      select.value = rule.entity;
    }
    choices(); search.oninput = choices;
    labeled(entityBox, 'Entité Home Assistant', select);
    select.onchange = () => {
      rule.entity = select.value;
      rule.during = { service: '', data: {} }; rule.after = { service: '', data: {} };
      renderRules();
    };
    const entity = catalog.entities.find(e => e.entity_id === rule.entity);
    if (entity) {
      const details = element('details'); details.append(element('summary', `État actuel : ${entity.state} · attributs en lecture seule`), element('pre', JSON.stringify(entity.attributes, null, 2))); entityBox.append(details);
    }
    row.append(entityBox);
    renderAction(row, rule, 'during'); renderAction(row, rule, 'after');
    const remove = element('button', 'Supprimer cette règle', 'secondary');
    remove.onclick = () => { rules = rules.filter(r => r !== rule); renderRules(); }; row.append(remove);
    $('rules').append(row);
  }
}
async function loadCatalog() {
  catalog = await api('catalog', {});
  catalog.entities.sort((a, b) => `${a.attributes?.friendly_name || a.entity_id}`.localeCompare(`${b.attributes?.friendly_name || b.entity_id}`));
  renderRules(); $('catalogStatus').textContent = `${catalog.entities.length} entités chargées.`;
}
async function save() {
  for (const control of $('rules').querySelectorAll('input,select,textarea')) if (!control.reportValidity()) return;
  await api('config', {
    clientId: $('clientId').value, clientSecret: $('clientSecret').value, redirectUri: $('redirectUri').value,
    calendarIds: [...selectedCalendars], dryRun: $('dryRun').checked, rules
  });
  $('clientSecret').value = ''; notice('Configuration enregistrée.');
}
function bind(id, handler) { $(id).onclick = async () => { try { await handler(); } catch (e) { notice(e.message); } }; }
bind('save', save); bind('saveRules', save);
bind('add', () => {
  rules.push({ id: createRuleId(), keyword: 'Présence', entity: '', priority: 0, during: { service: '', data: {} }, after: { service: '', data: {} } });
  renderRules();
});
bind('loadEntities', async () => { await loadCatalog(); notice('Entités et actions Home Assistant actualisées.'); });
bind('connect', async () => {
  const result = await api('connect', {}); const link = element('a', 'Ouvrir la connexion Google');
  link.href = result.url; link.target = '_blank'; link.rel = 'noopener'; $('connection').replaceChildren(link);
  notice('Clique sur le lien pour autoriser Google dans un nouvel onglet.');
});
bind('disconnect', async () => { await api('disconnect', {}); $('connection').textContent = 'Déconnecté'; notice('Compte déconnecté. Les entités conservent leur état actuel.'); });
bind('list', async () => {
  availableCalendars = await api('calendars', {});
  const primary = availableCalendars.find(c => c.primary);
  if (primary && selectedCalendars.delete('primary')) selectedCalendars.add(primary.id);
  renderCalendars(); notice('Coche les calendriers souhaités puis enregistre.');
});
bind('sync', async () => renderStatus(await api('sync', {})));
try {
  const s = await api('state'); csrf = s.csrf;
  for (const key of ['clientId', 'redirectUri']) $(key).value = s.config[key];
  selectedCalendars = new Set(s.config.calendarIds || ['primary']); renderCalendars();
  $('dryRun').checked = s.config.dryRun; rules = s.config.rules; renderRules();
  $('connection').textContent = s.connected ? 'Compte Google connecté' : 'Compte Google non connecté'; renderStatus(s.status);
  const base = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  $('suggestion').textContent = `Chemin de retour attendu : ${base}oauth/callback. Utiliser le domaine HTTPS de Home Assistant avec ce chemin.`;
  try { await loadCatalog(); } catch (e) { $('catalogStatus').textContent = e.message; }
} catch (e) { notice(e.message); }
setInterval(async () => {
  try { const s = await api('state'); renderStatus(s.status); $('connection').textContent = s.connected ? 'Compte Google connecté' : 'Compte Google non connecté'; } catch {}
}, 15000);
