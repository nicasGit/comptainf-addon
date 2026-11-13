export const eventColors = [
  ['1', 'Lavande'], ['2', 'Sauge'], ['3', 'Raisin'], ['4', 'Flamant'], ['5', 'Banane'],
  ['6', 'Mandarine'], ['7', 'Paon'], ['8', 'Graphite'], ['9', 'Myrtille (bleu)'], ['10', 'Basilic'], ['11', 'Tomate']
];
export function colorName(id) {
  if (!id || id === 'default') return 'Couleur du calendrier';
  return eventColors.find(([value]) => value === String(id))?.[1] || `Couleur ${id}`;
}
export function matchesColor(event, colorId) {
  if (!colorId) return true;
  if (colorId === 'default') return !event.colorId;
  return String(event.colorId || '') === colorId;
}
export function validateColor(colorId) {
  if (colorId === undefined || colorId === '' || colorId === 'default') return;
  if (typeof colorId !== 'string' || !eventColors.some(([id]) => id === colorId)) throw Error('Couleur d’événement Google invalide.');
}
