export const eventColors = [
  ['1', 'Lavande'], ['2', 'Sauge'], ['3', 'Raisin'], ['4', 'Flamant'], ['5', 'Banane'],
  ['6', 'Mandarine'], ['7', 'Paon'], ['8', 'Graphite'], ['9', 'Myrtille (bleu)'], ['10', 'Basilic'], ['11', 'Tomate']
];
const modernHex = ['#7986cb', '#33b679', '#8e24aa', '#e67c73', '#f6bf26', '#f4511e', '#039be5', '#616161', '#3f51b5', '#0b8043', '#d50000'];
export function validHex(value) { return typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value) ? value.toLowerCase() : null; }
function standardColor(hex, palette) {
  if (!hex) return null;
  const index = modernHex.indexOf(hex);
  return index >= 0 ? String(index + 1) : Object.entries(palette.event || {}).find(([, color]) => validHex(color.background) === hex)?.[0] || null;
}
export function resolveEventColor(event, labels = [], calendar = {}, palette = {}) {
  const label = labels.find(label => label.id === event.eventLabelId);
  if (event.eventLabelId) {
    const hex = validHex(label?.backgroundColor);
    const id = standardColor(hex, palette) || event.colorId || null;
    return { resolvedColorId: id, colorSource: 'event', colorHex: hex,
      colorLabel: id ? colorName(id) : label?.name || (hex ? `Couleur personnalisée ${hex}` : 'Couleur de l’événement non résolue') };
  }
  if (event.colorId) {
    return { resolvedColorId: event.colorId, colorSource: 'event', colorHex: validHex(palette.event?.[event.colorId]?.background), colorLabel: colorName(event.colorId) };
  }
  const hex = validHex(calendar.backgroundColor) || validHex(palette.calendar?.[calendar.colorId]?.background);
  const id = standardColor(hex, palette);
  return { resolvedColorId: null, colorSource: hex ? 'calendar' : 'unknown', colorHex: hex,
    colorLabel: hex ? `${id ? colorName(id) : hex} (héritée du calendrier)` : 'Couleur non renseignée par Google' };
}
export function colorName(id) {
  if (!id || id === 'default') return 'Couleur du calendrier';
  if (validHex(id)) return `Couleur personnalisée ${validHex(id)}`;
  return eventColors.find(([value]) => value === String(id))?.[1] || `Couleur ${id}`;
}
export function matchesColor(event, colorId) {
  if (!colorId) return true;
  if (validHex(colorId)) return validHex(event.colorHex) === validHex(colorId);
  if (colorId === 'default') return !event.colorId && !event.eventLabelId;
  return String(event.resolvedColorId || event.colorId || '') === colorId;
}
export function validateColor(colorId) {
  if (colorId === undefined || colorId === '' || colorId === 'default') return;
  if (validHex(colorId)) return;
  if (typeof colorId !== 'string' || !eventColors.some(([id]) => id === colorId)) throw Error('Couleur d’événement Google invalide.');
}
