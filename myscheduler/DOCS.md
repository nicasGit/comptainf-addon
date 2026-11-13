# MyScheduler

## Programmes hebdomadaires sans calendrier

Cliquer **Ajouter un programme hebdomadaire**, donner un nom, choisir l’entité et les actions pendant/après, puis cocher les jours et saisir les heures. Aucun compte Google ni mot-clé n’est nécessaire. Par exemple : lundi/mardi/mercredi 07:00–22:00. Les programmes continuent pendant une panne Google.

Les cartes affichent un résumé des horaires et se déplient pour l’édition. Utiliser la recherche, le filtre par type et **Tout replier**. La duplication crée une copie en pause ; enregistrer pour appliquer la copie, les modifications et les pauses. Les priorités départagent tous les programmes actifs sur la même entité, quel que soit leur type.

## Programmes depuis Google Calendar

Planifie les actions des entités Home Assistant à partir des événements de ton Google Calendar personnel.

1. Démarrer le module et ouvrir son interface Web.
2. Créer un client Google OAuth « Application Web » avec Google Calendar API activée et une URL de retour HTTPS correspondant au chemin indiqué dans l’interface.
3. Enregistrer les identifiants OAuth, connecter le compte Google, puis charger les calendriers et cocher ceux à surveiller (1 à 20). Enregistrer la sélection.
4. Charger les entités Home Assistant puis ajouter une règle : mot-clé du titre, entité, priorité, action et paramètres **pendant** et **après** l’événement. Exemple : allumer une lampe à 60 % puis l’éteindre, ou régler un thermostat à 21 °C puis à 17 °C.
5. Vérifier les résultats en simulation avant de désactiver cette option.

Les événements avec horaires utilisent leurs heures. Pour les événements **toute la journée**, activer l’option dans la règle puis choisir le fuseau et les plages par jour de semaine. Le mot-clé reste obligatoire : les plages ne se déclenchent pas chaque semaine en l’absence d’événement correspondant.

Une plage 22:00 → 07:00 se termine le lendemain. Chaque plage peut reprendre l’action pendant, l’action après ou une action spécifique. Le bouton **Préremplir vendredi, week-end et mercredi** prépare l’exemple : vendredi 19–22, samedi/dimanche 7–22, nuits vendredi/samedi 22–7 et mercredi à partir de 7 h avec une action spécifique à choisir. Les journées entières restent ignorées par les anciennes règles tant que l’option n’est pas activée.

Sans plage, l’action pendant couvre toute la journée. Avec des plages, aucune action n’est envoyée avant la première ; la fin d’une plage applique l’action après, sauf si une autre plage ou règle prend le relais. Une plage de nuit peut déborder après le dernier jour de l’événement. Les chevauchements dans une même règle sont refusés.

La synchronisation se fait toutes les 60 secondes. Les attributs en lecture seule ne sont pas modifiables ; les champs proposés sont les paramètres des actions exposées par HA. Les valeurs complexes peuvent être saisies en JSON.

Une action est mémorisée après envoi et n’est pas répétée à chaque synchronisation. Une coupure entre l’envoi et la sauvegarde peut toutefois entraîner une répétition ; privilégier les actions explicites plutôt que les bascules `toggle`. Les anciennes règles de thermostat sont converties automatiquement.

Les règles s’appliquent à tous les calendriers sélectionnés, avec les mêmes priorités. Un calendrier inaccessible suspend la synchronisation entière pour éviter les commandes calculées sur des événements manquants. La mise à jour depuis 0.1.0 conserve le calendrier et la connexion Google existants.

Voir le [guide complet, les contraintes OAuth et les limites de cette première version](https://github.com/nicasGit/comptainf-addon/blob/main/MyScheduler.md).
