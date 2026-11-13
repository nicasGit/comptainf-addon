import { servicesForEntity } from './home-assistant.mjs';
import { entityName, serviceName, valueLabel, searchText } from './labels.mjs';
import { eventMode } from './actions.mjs';
import { eventColors, colorName } from './event-colors.mjs';

const $ = id => document.getElementById(id);
let csrf;
let selectedCalendars = new Set(['primary']);
let availableCalendars = [];
let catalog = { entities: [], services: [] };
let rules = [];
let ruleSequence = 0;
const openPrograms = new Set();
let googleConnected = false;
function updateSetup(connected, initial = false) {
  const becameConnected = connected && !googleConnected;
  googleConnected = connected;
  $('googleSetupState').textContent = connected ? 'Connecté' : 'Non connecté · facultatif';
  $('calendarSetupState').textContent = `${selectedCalendars.size} sélectionné(s)`;
  if (connected && selectedCalendars.size && (initial || becameConnected)) {
    $('googlePanel').open = false; $('calendarPanel').open = false;
  } else if (initial) {
    const weeklyOnly = rules.length > 0 && rules.every(rule => rule.source === 'weekly');
    $('googlePanel').open = !connected && !weeklyOnly;
    $('calendarPanel').open = !selectedCalendars.size;
  }
}

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
  $('actions').textContent = status.actions.map(a => `${a.entity} → ${a.service} ${JSON.stringify(a.data)} (${a.phase === 'after' ? 'après' : a.phase === 'schedule' ? 'plage horaire' : 'pendant'})`).join('\n') || 'Aucune action';
  $('events').textContent = status.events.map(e => {
    const calendar = availableCalendars.find(c => c.id === e.calendarId);
    const color = colorName(e.colorId);
    return e.allDay ? `${e.start} → ${e.end} (fin exclue) · Toute la journée · [${calendar?.summary || e.calendarId || 'Calendrier'}] ${e.title} · ${color}`
      : `${new Date(e.start).toLocaleString()} → ${new Date(e.end).toLocaleString()} · [${calendar?.summary || e.calendarId || 'Calendrier'}] ${e.title} · ${color}`;
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
    for (const choice of choices) option(input, typeof choice === 'object' ? choice.value : choice, valueLabel(typeof choice === 'object' ? choice.label || choice.value : choice));
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
function renderAction(parent, rule, phase, title, owner = rule) {
  const box = element('fieldset'); box.append(element('legend', title || (phase === 'during' ? 'Pendant l’événement' : 'Après l’événement / hors plages')));
  parent.append(box);
  const entity = catalog.entities.find(e => e.entity_id === rule.entity);
  const services = servicesForEntity(entity, catalog.services);
  const action = owner[phase];
  const select = element('select'); option(select, '', 'Choisir une action');
  for (const service of services) option(select, service.id, `${serviceName(service)} · ${service.id}`);
  if (action.service && !services.some(s => s.id === action.service)) option(select, action.service, `${action.service} (enregistrée, disponibilité à vérifier)`);
  select.value = action.service; select.required = true;
  labeled(box, 'Action', select);
  select.onchange = () => { owner[phase] = { service: select.value, data: {} }; renderRules(); };
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
    labeled(box, `${fieldNames[key] || field.name || key}${unit ? ` (${unit})` : ''}${field.required ? ' *' : ''}`, control);
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
const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
function renderSchedule(parent, rule) {
  const box = element('div', undefined, 'wide schedule');
  const weekly = rule.source === 'weekly';
  if (weekly) rule.weekly ||= { enabled: true, timeZone: 'Europe/Zurich', periods: [{ id: createRuleId(), days: [1, 2, 3], start: '07:00', end: '22:00', mode: 'during' }] };
  if (!weekly) {
    const mode = element('select');
    option(mode, 'timed', 'Événements avec horaires uniquement');
    option(mode, 'both', 'Avec horaires et toute la journée');
    option(mode, 'all_day', 'Toute la journée uniquement');
    mode.value = eventMode(rule);
    mode.onchange = () => {
      rule.eventMode = mode.value;
      rule.allDay ||= { enabled: false, timeZone: 'Europe/Zurich', periods: [] };
      rule.allDay.enabled = mode.value !== 'timed'; renderRules();
    };
    labeled(box, 'Événements pris en compte', mode);
  }
  parent.append(box);
  if (!weekly && eventMode(rule) === 'timed') return;
  const schedule = weekly ? rule.weekly : rule.allDay;
  const zone = element('input'); zone.value = schedule.timeZone; zone.placeholder = 'Europe/Zurich'; zone.required = true;
  zone.oninput = () => { schedule.timeZone = zone.value; }; labeled(box, 'Fuseau horaire des plages', zone);
  box.append(element('p', weekly ? 'Chaque semaine, sans calendrier ni mot-clé. Les jours cochés sont les jours de début. Une plage 22:00 → 07:00 se termine le lendemain.' : 'Le mot-clé doit correspondre à un événement du calendrier. Les jours cochés sont les jours de début des plages. Une fin inférieure ou égale au début signifie le lendemain (22:00 → 07:00 passe minuit).'));
  box.append(element('p', weekly ? 'Ajouter au moins une plage. Hors plage, l’action après est appliquée à la sortie, sauf si un autre programme prend le relais. Aucune action avant la première activation.' : 'Sans plage : action pendant toute la journée. Avec des plages : aucune action avant la première plage ; à la fin d’une plage, l’action après s’applique, sauf si une autre plage ou règle prend le relais. Une plage de nuit se termine le lendemain même si l’événement ne couvre que la veille.'));
  for (const [index, period] of schedule.periods.entries()) {
    const slot = element('fieldset', undefined, 'period'); slot.append(element('legend', `Plage ${index + 1}`));
    const days = element('div', undefined, 'weekdays');
    for (const [i, name] of weekdays.entries()) {
      const check = element('input'); check.type = 'checkbox'; check.checked = period.days.includes(i + 1);
      check.onchange = () => { period.days = check.checked ? [...period.days, i + 1].sort((a, b) => a - b) : period.days.filter(day => day !== i + 1); };
      const label = element('label'); label.append(check, document.createTextNode(` ${name}`)); days.append(label);
    }
    slot.append(days);
    const times = element('div', undefined, 'times');
    for (const [key, name] of [['start', 'Début'], ['end', 'Fin']]) {
      const time = element('input'); time.type = 'time'; time.value = period[key]; time.required = true;
      time.oninput = () => { period[key] = time.value; }; labeled(times, name, time);
    }
    slot.append(times);
    const mode = element('select');
    option(mode, 'during', 'Utiliser l’action pendant'); option(mode, 'after', 'Utiliser l’action après'); option(mode, 'custom', 'Action spécifique pour cette plage');
    mode.value = period.mode;
    mode.onchange = () => { period.mode = mode.value; if (period.mode === 'custom') period.action ||= { service: '', data: {} }; renderRules(); };
    labeled(slot, 'Action de cette plage', mode);
    if (period.mode === 'custom') renderAction(slot, rule, 'action', 'Action spécifique', period);
    const remove = element('button', 'Supprimer la plage', 'secondary'); remove.onclick = () => { schedule.periods = schedule.periods.filter(p => p !== period); renderRules(); };
    slot.append(remove); box.append(slot);
  }
  const add = element('button', 'Ajouter une plage', 'secondary');
  add.onclick = () => { schedule.periods.push({ id: createRuleId(), days: [5], start: '19:00', end: '22:00', mode: 'during' }); renderRules(); }; box.append(add);
  if (!schedule.periods.length) {
    const example = element('button', 'Préremplir vendredi, week-end et mercredi', 'secondary');
    example.onclick = () => {
      schedule.periods = [
        { id: createRuleId(), days: [5], start: '19:00', end: '22:00', mode: 'during' },
        { id: createRuleId(), days: [6, 7], start: '07:00', end: '22:00', mode: 'during' },
        { id: createRuleId(), days: [5, 6], start: '22:00', end: '07:00', mode: 'after' },
        { id: createRuleId(), days: [3], start: '07:00', end: '00:00', mode: 'custom', action: { service: '', data: {} } }
      ]; renderRules();
    }; box.append(example);
    box.append(element('small', 'Cet exemple utilise pendant pour monter, après pour baisser et une action spécifique à choisir pour arrêter le mercredi.'));
  }
}
function programTitle(rule) { return rule.name?.trim() || (rule.source === 'weekly' ? 'Programme hebdomadaire' : rule.keyword || 'Programme calendrier'); }
function briefAction(action) {
  if (!action?.service) return 'à choisir';
  const parameters = Object.entries(action.data).map(([key, value]) => `${fieldNames[key] || key} : ${Array.isArray(value) || value && typeof value === 'object' ? JSON.stringify(value) : valueLabel(value)}`).join(', ');
  return `${serviceName({ id: action.service })}${parameters ? ` — ${parameters}` : ''}`;
}
function programOverview(rule) {
  const schedule = rule.source === 'weekly' ? rule.weekly : rule.allDay?.enabled ? rule.allDay : null;
  if (rule.source === 'weekly' && !schedule) return 'Plages hebdomadaires à configurer';
  if (!schedule) return `Mot-clé : ${rule.keyword || 'à renseigner'} · horaires des événements`;
  const type = rule.source === 'weekly' ? '' : eventMode(rule) === 'all_day' ? 'Journées entières uniquement · ' : 'Avec horaires et journées entières · ';
  if (!schedule.periods.length) return `${type}sans plages`;
  return type + schedule.periods.map(period => `${period.days.map(day => weekdays[day - 1]?.slice(0, 3)).join('/')} ${period.start}–${period.end}${period.end <= period.start ? ' (+1 jour)' : ''} · ${period.mode === 'during' ? 'Pendant' : period.mode === 'after' ? 'Après' : 'Spécifique'}`).join(' | ');
}
function renderRules() {
  $('rules').replaceChildren();
  const query = searchText($('programSearch').value);
  const sourceFilter = $('programSource').value;
  $('programCount').textContent = `${rules.length} programme(s) · ${rules.filter(rule => rule.enabled !== false).length} actif(s). Enregistrer pour appliquer les changements.`;
  for (const rule of rules) {
    if (sourceFilter !== 'all' && (rule.source || 'calendar') !== sourceFilter) continue;
    if (query && !searchText(`${programTitle(rule)} ${rule.keyword || ''} ${rule.entity} ${programOverview(rule)} ${rule.eventColorId ? colorName(rule.eventColorId) : ''}`).includes(query)) continue;
    const card = element('details', undefined, `program-card${rule.enabled === false ? ' paused' : ''}`);
    card.open = openPrograms.has(rule.id);
    const summary = element('summary');
    function refreshSummary() {
      summary.replaceChildren(element('strong', programTitle(rule)), element('span', `${rule.enabled === false ? 'En pause' : 'Actif'} · ${rule.source === 'weekly' ? 'Hebdomadaire' : 'Calendrier'} · priorité ${rule.priority}`, 'badge'), element('span', rule.entity || 'Entité à choisir', 'program-entity'), element('span', programOverview(rule), 'program-overview'));
      summary.append(element('span', `Pendant : ${briefAction(rule.during)} | Après : ${briefAction(rule.after)}`, 'program-overview'));
      if (rule.source !== 'weekly' && rule.eventColorId) summary.append(element('span', `Mot-clé : ${rule.keyword} + couleur : ${colorName(rule.eventColorId)}`, 'program-overview'));
    }
    refreshSummary(); card.append(summary);
    card.ontoggle = () => { if (card.open) openPrograms.add(rule.id); else openPrograms.delete(rule.id); };
    const row = element('div', undefined, 'rule');
    row.addEventListener('input', refreshSummary); row.addEventListener('change', refreshSummary);
    const name = element('input'); name.value = rule.name || ''; name.maxLength = 120; name.placeholder = 'Ex. Chauffage semaine – salon'; name.oninput = () => { rule.name = name.value; refreshSummary(); }; labeled(row, 'Nom du programme', name);
    const source = element('select'); option(source, 'calendar', 'Calendrier · mot-clé'); option(source, 'weekly', 'Hebdomadaire · hors calendrier'); source.value = rule.source || 'calendar';
    source.onchange = () => { rule.source = source.value; renderRules(); }; labeled(row, 'Déclenchement', source);
    const enabled = element('input'); enabled.type = 'checkbox'; enabled.checked = rule.enabled !== false; enabled.onchange = () => { rule.enabled = enabled.checked; refreshSummary(); card.classList.toggle('paused', !enabled.checked); }; const toggle = element('label'); toggle.append(enabled, document.createTextNode(' Programme activé')); row.append(toggle);
    if (rule.source !== 'weekly') {
      const keyword = element('input'); keyword.value = rule.keyword || ''; keyword.required = true; keyword.oninput = () => { rule.keyword = keyword.value; refreshSummary(); };
      labeled(row, 'Mot-clé du titre', keyword);
      const color = element('select'); option(color, '', 'Toutes les couleurs (mot-clé seul)');
      for (const [id, name] of eventColors) option(color, id, name);
      option(color, 'default', 'Sans couleur propre (héritée du calendrier)');
      color.value = rule.eventColorId || '';
      color.onchange = () => { rule.eventColorId = color.value; refreshSummary(); };
      labeled(row, 'Couleur de l’événement (ET le mot-clé)', color);
      row.append(element('small', 'La couleur choisie doit être attribuée à l’événement dans Google. Un événement bleu par héritage du calendrier ne correspond pas à Myrtille.', 'wide'));
    }
    const priority = element('input'); priority.type = 'number'; priority.step = '1'; priority.min = '-1000'; priority.max = '1000'; priority.value = rule.priority; priority.required = true;
    priority.oninput = () => { rule.priority = Number(priority.value); refreshSummary(); }; labeled(row, 'Priorité', priority);
    const entityBox = element('div', undefined, 'wide');
    const search = element('input'); search.type = 'search'; search.placeholder = 'Rechercher par nom ou identifiant';
    labeled(entityBox, 'Rechercher une entité', search);
    const select = element('select'); select.required = true;
    function choices() {
      select.replaceChildren(); option(select, '', 'Choisir une entité');
      const needle = searchText(search.value);
      const matches = catalog.entities.filter(e => e.entity_id === rule.entity || searchText(`${e.entity_id} ${e.attributes?.friendly_name || ''} ${entityName(e)}`).includes(needle));
      for (const e of matches) option(select, e.entity_id, `${entityName(e)} · ${e.entity_id}${e.state === 'unavailable' ? ' (indisponible)' : ''}`);
      if (rule.entity && !matches.some(e => e.entity_id === rule.entity)) option(select, rule.entity, `${rule.entity} (enregistrée)`);
      select.value = rule.entity;
    }
    choices(); search.oninput = choices;
    labeled(entityBox, 'Entité Home Assistant', select);
    select.onchange = () => {
      rule.entity = select.value;
      rule.during = { service: '', data: {} }; rule.after = { service: '', data: {} };
      for (const period of rule.allDay?.periods || []) if (period.mode === 'custom') period.action = { service: '', data: {} };
      for (const period of rule.weekly?.periods || []) if (period.mode === 'custom') period.action = { service: '', data: {} };
      renderRules();
    };
    const entity = catalog.entities.find(e => e.entity_id === rule.entity);
    if (entity) {
      const details = element('details'); details.append(element('summary', `État actuel : ${valueLabel(entity.state)} · attributs en lecture seule`), element('pre', JSON.stringify(entity.attributes, null, 2))); entityBox.append(details);
    }
    row.append(entityBox);
    renderAction(row, rule, 'during'); renderAction(row, rule, 'after');
    renderSchedule(row, rule);
    const remove = element('button', 'Supprimer cette règle', 'secondary');
    remove.onclick = () => { rules = rules.filter(r => r !== rule); renderRules(); }; row.append(remove);
    const duplicate = element('button', 'Dupliquer le programme', 'secondary');
    duplicate.onclick = () => {
      const copy = JSON.parse(JSON.stringify(rule)); copy.id = createRuleId(); copy.name = `${programTitle(rule)} (copie)`.slice(0, 120); copy.enabled = false;
      rules.push(copy); openPrograms.add(copy.id); renderRules();
    }; row.append(duplicate);
    card.append(row); $('rules').append(card);
  }
}
async function loadCatalog() {
  catalog = await api('catalog', {});
  catalog.entities.sort((a, b) => entityName(a).localeCompare(entityName(b), 'fr'));
  renderRules(); $('catalogStatus').textContent = `${catalog.entities.length} entités chargées.`;
  $('entitySetupState').textContent = `${catalog.entities.length} chargée(s)`;
}
async function save() {
  for (const control of $('rules').querySelectorAll('input,select,textarea')) if (!control.checkValidity()) {
    for (let node = control.parentElement; node; node = node.parentElement) if (node.tagName === 'DETAILS') node.open = true;
    control.reportValidity(); return;
  }
  await api('config', {
    clientId: $('clientId').value, clientSecret: $('clientSecret').value, redirectUri: $('redirectUri').value,
    calendarIds: [...selectedCalendars], dryRun: $('dryRun').checked, rules
  });
  $('clientSecret').value = ''; notice('Configuration enregistrée.');
  updateSetup(googleConnected);
  if (googleConnected && selectedCalendars.size) { $('googlePanel').open = false; $('calendarPanel').open = false; }
}
function bind(id, handler) { $(id).onclick = async () => { try { await handler(); } catch (e) { notice(e.message); } }; }
bind('save', save); bind('saveRules', save); bind('saveCalendars', save);
bind('add', () => {
  const id = createRuleId(); openPrograms.add(id);
  rules.push({ id, source: 'calendar', name: '', keyword: 'Présence', entity: '', priority: 0, during: { service: '', data: {} }, after: { service: '', data: {} } });
  renderRules();
});
bind('addWeekly', () => {
  const id = createRuleId(); openPrograms.add(id);
  rules.push({ id, source: 'weekly', name: '', entity: '', priority: 0, during: { service: '', data: {} }, after: { service: '', data: {} } }); renderRules();
});
$('programSearch').oninput = renderRules; $('programSource').onchange = renderRules;
bind('collapsePrograms', () => { openPrograms.clear(); renderRules(); });
bind('loadEntities', async () => { await loadCatalog(); notice('Entités et actions Home Assistant actualisées.'); });
bind('connect', async () => {
  const result = await api('connect', {}); const link = element('a', 'Ouvrir la connexion Google');
  link.href = result.url; link.target = '_blank'; link.rel = 'noopener'; $('connection').replaceChildren(link);
  notice('Clique sur le lien pour autoriser Google dans un nouvel onglet.');
});
bind('disconnect', async () => { await api('disconnect', {}); updateSetup(false); $('connection').textContent = 'Déconnecté'; notice('Compte déconnecté. Les programmes hebdomadaires continuent.'); });
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
  updateSetup(s.connected, true);
  const base = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  $('suggestion').textContent = `Chemin de retour attendu : ${base}oauth/callback. Utiliser le domaine HTTPS de Home Assistant avec ce chemin.`;
  try { await loadCatalog(); } catch (e) { $('catalogStatus').textContent = e.message; $('entitySetupState').textContent = 'Indisponible'; }
} catch (e) { notice(e.message); }
setInterval(async () => {
  try { const s = await api('state'); renderStatus(s.status); updateSetup(s.connected); $('connection').textContent = s.connected ? 'Compte Google connecté' : 'Compte Google non connecté'; } catch {}
}, 15000);
