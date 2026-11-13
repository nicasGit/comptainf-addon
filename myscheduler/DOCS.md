# MyScheduler

Planifie les actions des entités Home Assistant à partir des événements de ton Google Calendar personnel.

1. Démarrer le module et ouvrir son interface Web.
2. Créer un client Google OAuth « Application Web » avec Google Calendar API activée et une URL de retour HTTPS correspondant au chemin indiqué dans l’interface.
3. Enregistrer les identifiants OAuth, connecter le compte Google, puis charger les calendriers et cocher ceux à surveiller (1 à 20). Enregistrer la sélection.
4. Charger les entités Home Assistant puis ajouter une règle : mot-clé du titre, entité, priorité, action et paramètres **pendant** et **après** l’événement. Exemple : allumer une lampe à 60 % puis l’éteindre, ou régler un thermostat à 21 °C puis à 17 °C.
5. Vérifier les résultats en simulation avant de désactiver cette option.

Seuls les événements avec horaires sont pris en compte. La synchronisation se fait toutes les 60 secondes. À la fin d’un événement, l’action après s’applique, sauf si une autre règle active prend le relais. Les attributs en lecture seule ne sont pas modifiables ; les champs proposés sont les paramètres des actions exposées par HA. Les valeurs complexes peuvent être saisies en JSON.

Une action est mémorisée après envoi et n’est pas répétée à chaque synchronisation. Une coupure entre l’envoi et la sauvegarde peut toutefois entraîner une répétition ; privilégier les actions explicites plutôt que les bascules `toggle`. Les anciennes règles de thermostat sont converties automatiquement.

Les règles s’appliquent à tous les calendriers sélectionnés, avec les mêmes priorités. Un calendrier inaccessible suspend la synchronisation entière pour éviter les commandes calculées sur des événements manquants. La mise à jour depuis 0.1.0 conserve le calendrier et la connexion Google existants.

Voir le [guide complet, les contraintes OAuth et les limites de cette première version](https://github.com/nicasGit/comptainf-addon/blob/main/MyScheduler.md).
