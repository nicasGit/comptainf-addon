export const snapshot = {
  entities: [
    { entity_id: 'climate.salon', state: 'heat', attributes: { friendly_name: 'Thermostat salon', supported_features: 1, min_temp: 7, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['off', 'heat', 'auto'] } },
    { entity_id: 'light.salon', state: 'off', attributes: { friendly_name: 'Lampe salon', supported_features: 0 } },
    { entity_id: 'switch.pompe', state: 'off', attributes: { friendly_name: 'Pompe' } },
    { entity_id: 'sensor.temperature', state: '21', attributes: { friendly_name: 'Température' } }
  ],
  services: [
    { domain: 'climate', services: {
      set_temperature: { name: 'Régler la température', target: { entity: [{ domain: 'climate', supported_features: [1] }] }, fields: { temperature: { selector: { number: { min: 0, max: 100, step: 0.1 } } }, hvac_mode: { selector: { select: { options: ['auto', 'heat', 'off'] } } } } },
      set_hvac_mode: { name: 'Choisir le mode', target: { entity: [{ domain: 'climate' }] }, fields: { hvac_mode: { required: true, selector: { select: { options: ['auto', 'heat', 'off'] } } } } },
      unsupported: { target: { entity: [{ domain: 'climate', supported_features: [256] }] }, fields: {} }
    } },
    { domain: 'light', services: {
      turn_on: { name: 'Allumer', target: { entity: [{ domain: 'light' }] }, fields: { brightness_pct: { selector: { number: { min: 0, max: 100 } } }, rgb_color: { selector: { color_rgb: {} } } } },
      turn_off: { name: 'Éteindre', target: { entity: [{ domain: 'light' }] }, fields: {} }
    } },
    { domain: 'switch', services: { turn_on: { target: {}, fields: {} }, turn_off: { target: {}, fields: {} } } },
    { domain: 'homeassistant', services: { restart: { fields: {} }, turn_on: { target: { entity: [{ domain: ['switch', 'light'] }] }, fields: {} } } }
  ]
};
