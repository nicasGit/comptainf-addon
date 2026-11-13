import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entityName, serviceName, valueLabel, searchText } from '../myscheduler/labels.mjs';

test('translate radiator labels while preserving user names and HA identity', () => {
  const entity = { entity_id: 'switch.radiateur_bapt_child_lock', attributes: { friendly_name: 'Radiateur bapt Child lock' } };
  assert.equal(entityName(entity), 'Radiateur bapt Verrouillage enfant');
  assert.equal(entity.entity_id, 'switch.radiateur_bapt_child_lock');
  assert.equal(entity.attributes.friendly_name, 'Radiateur bapt Child lock');
  for (const [english, french] of [['Frost protection temperature', 'Température de protection antigel'], ['Temperature sensor', 'Capteur de température'], ['Valve closing limit voltage', 'Tension limite de fermeture de la vanne']]) {
    assert.equal(entityName({ ...entity, attributes: { friendly_name: `Radiateur bapt ${english}` } }), `Radiateur bapt ${french}`);
  }
});
test('retain custom French names and unknown labels; fallback from entity ID', () => {
  assert.equal(entityName({ entity_id: 'light.salon', attributes: { friendly_name: 'Lampe du salon' } }), 'Lampe du salon');
  assert.equal(entityName({ entity_id: 'sensor.x', attributes: { friendly_name: 'My custom unknown name' } }), 'My custom unknown name');
  assert.equal(entityName({ entity_id: 'switch.radiateur_child_lock', attributes: {} }), 'radiateur Verrouillage enfant');
});
test('translate actions and options without altering machine values', () => {
  assert.equal(serviceName({ id: 'climate.set_hvac_mode', name: 'Set HVAC mode' }), 'Choisir le mode de chauffage');
  assert.equal(serviceName({ id: 'custom.unknown', name: 'Custom action' }), 'Custom action');
  assert.equal(valueLabel('heat'), 'Chauffage');
  assert.equal(valueLabel('custom preset'), 'custom preset');
  assert.equal(searchText('Température ÉCONOMIQUE'), 'temperature economique');
});
