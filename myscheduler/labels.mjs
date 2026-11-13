// Presentation only: entity IDs, service names and values sent to HA stay unchanged.
const entityTerms = [
  ['Valve closing limit voltage', 'Tension limite de fermeture de la vanne'],
  ['Frost protection temperature', 'Température de protection antigel'],
  ['External temperature input', 'Température externe'],
  ['Local temperature calibration', 'Correction de température locale'],
  ['Smart temperature control', 'Régulation intelligente de température'],
  ['Temporary mode duration', 'Durée du mode temporaire'],
  ['Timer mode target temp', 'Température cible du mode minuterie'],
  ['Temperature sensor select', 'Choix du capteur de température'],
  ['Temporary mode select', 'Choix du mode temporaire'],
  ['Valve closing degree', 'Degré de fermeture de la vanne'],
  ['Valve opening degree', 'Degré d’ouverture de la vanne'],
  ['Temperature accuracy', 'Précision de température'],
  ['Temperature sensor', 'Capteur de température'],
  ['Temporary mode', 'Mode temporaire'],
  ['Local temperature', 'Température locale'],
  ['External temperature', 'Température externe'],
  ['Closing steps', 'Nombre de pas de fermeture'],
  ['Opening steps', 'Nombre de pas d’ouverture'],
  ['Idle steps', 'Nombre de pas au repos'],
  ['Child lock', 'Verrouillage enfant'],
  ['Open window', 'Détection de fenêtre ouverte'],
  ['Window detection', 'Détection de fenêtre ouverte'],
  ['Battery low', 'Batterie faible'],
  ['Battery', 'Batterie'],
  ['Linkquality', 'Qualité de liaison'],
  ['Link quality', 'Qualité de liaison'],
  ['Humidity', 'Humidité'],
  ['Temperature', 'Température'],
  ['Power', 'Puissance'],
  ['Energy', 'Énergie'],
  ['Voltage', 'Tension'],
  ['Current', 'Courant'],
  ['Occupancy', 'Présence'],
  ['Motion', 'Mouvement']
];

export function entityName(entity) {
  const original = entity.attributes?.friendly_name || entity.entity_id.split('.').slice(1).join('.').replaceAll('_', ' ');
  for (const [english, french] of entityTerms) {
    const text = original.toLocaleLowerCase('fr');
    const suffix = english.toLocaleLowerCase('fr');
    if (text === suffix) return french;
    if (text.endsWith(` ${suffix}`)) return `${original.slice(0, -english.length)}${french}`;
  }
  return entity.entity_id.startsWith('update.') ? `${original} · Mise à jour` : original;
}

const actions = {
  turn_on: 'Activer / allumer', turn_off: 'Désactiver / éteindre', toggle: 'Basculer l’état',
  set_temperature: 'Régler la température', set_hvac_mode: 'Choisir le mode de chauffage',
  set_preset_mode: 'Choisir le préréglage', set_fan_mode: 'Choisir le mode de ventilation',
  set_swing_mode: 'Choisir l’oscillation', set_humidity: 'Régler l’humidité',
  set_value: 'Définir la valeur', select_option: 'Choisir une option', select_next: 'Option suivante', select_previous: 'Option précédente',
  open_cover: 'Ouvrir le volet', close_cover: 'Fermer le volet', stop_cover: 'Arrêter le volet', set_cover_position: 'Régler la position du volet',
  set_percentage: 'Régler la vitesse', set_direction: 'Choisir le sens', oscillate: 'Activer l’oscillation',
  volume_set: 'Régler le volume', volume_mute: 'Couper / rétablir le son', media_play: 'Lancer la lecture', media_pause: 'Mettre en pause', media_stop: 'Arrêter la lecture',
  select_source: 'Choisir la source', lock: 'Verrouiller', unlock: 'Déverrouiller', press: 'Appuyer',
  update_entity: 'Actualiser l’entité', trigger: 'Déclencher', reload: 'Recharger', install: 'Installer la mise à jour'
};
export function serviceName(service) { const key = service.id.split('.')[1]; return Object.hasOwn(actions, key) ? actions[key] : service.name || service.id; }

const values = {
  on: 'Activé', off: 'Désactivé', heat: 'Chauffage', cool: 'Climatisation', heat_cool: 'Chauffage / climatisation',
  auto: 'Automatique', manual: 'Manuel', eco: 'Économique', comfort: 'Confort', away: 'Absent', home: 'Présent',
  sleep: 'Nuit', boost: 'Chauffe rapide', none: 'Aucun', fan_only: 'Ventilation seule', dry: 'Déshumidification',
  internal: 'Interne', external: 'Externe', local: 'Local', unavailable: 'Indisponible', unknown: 'Inconnu',
  open: 'Ouvert', closed: 'Fermé', locked: 'Verrouillé', unlocked: 'Déverrouillé'
};
export function valueLabel(value) { return Object.hasOwn(values, value) ? values[value] : String(value); }
export function searchText(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'); }
