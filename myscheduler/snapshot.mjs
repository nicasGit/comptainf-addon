export async function calendarSnapshot(rules, fetchEvents) {
  if (!rules.some(rule => rule.enabled !== false && rule.source !== 'weekly')) return { events: [], calendarAvailable: true, warning: '' };
  try { return { events: await fetchEvents(), calendarAvailable: true, warning: '' }; }
  catch (error) { return { events: [], calendarAvailable: false, warning: `Calendrier indisponible : ${error.message} Les programmes hebdomadaires continuent ; les actions calendaires en cours sont conservées.` }; }
}
