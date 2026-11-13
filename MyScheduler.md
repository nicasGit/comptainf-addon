# MyScheduler · add-on Home Assistant OS

Connexion directe à Google Calendar en lecture seule, sélection de plusieurs calendriers du même compte, règles par mots-clés et consignes de température sur les entités `climate` Home Assistant (notamment les vannes Zigbee2MQTT découvertes par MQTT).

## Version 0.1.1 : plusieurs calendriers

Après mise à jour, le calendrier et la connexion Google existants sont conservés. Cliquer **Charger mes calendriers**, cocher les calendriers souhaités (1 à 20), puis **Enregistrer**. Les règles s’appliquent à tous les calendriers sélectionnés, avec les mêmes priorités entre calendriers. Les événements affichent leur calendrier d’origine. Si un calendrier est inaccessible, la synchronisation entière est suspendue : aucune consigne de fin n’est déduite d’une lecture partielle.

## Installation locale sur HAOS

1. Copier le dossier [myscheduler](./myscheduler/) dans `/addons/myscheduler` sur la machine Home Assistant, par exemple avec Samba ou SSH.
2. Dans Paramètres → Modules complémentaires → Boutique, actualiser la liste. Installer **MyScheduler** dans les modules locaux.
3. Démarrer et ouvrir l’interface Web. Aucun port réseau n’est publié : l’interface passe par Home Assistant Ingress.

Architectures : amd64 et aarch64. La construction télécharge l’image Node officielle. Cette version n’a pas encore été installée et validée sur un vrai HAOS.

## Connexion Google personnelle

1. Créer un projet dans [Google Cloud](https://console.cloud.google.com/), activer **Google Calendar API**.
2. Configurer l’écran de consentement Google Auth Platform pour un usage externe et ajouter ton compte personnel aux utilisateurs de test si l’application reste en test.
3. Créer un client OAuth de type **Application Web**. Conserver l’identifiant client et le secret.
4. Ouvrir l’interface MyScheduler par l’accès HTTPS de Home Assistant, sur un domaine accepté par Google. Repérer le chemin de retour indiqué dans l’interface. Construire l’URL complète avec ce domaine, par exemple `https://ha.exemple.ch/api/hassio_ingress/SESSION/oauth/callback`. Enregistrer exactement cette URL dans les URI de redirection autorisés du client Google, puis dans MyScheduler.
5. Enregistrer les identifiants dans MyScheduler puis cliquer **Connecter Google** et ouvrir le lien dans un nouvel onglet. Autoriser la lecture du calendrier avec le compte personnel.
6. Charger les calendriers, cocher ceux à surveiller et enregistrer.

Google impose HTTPS et des règles sur le domaine de retour ; une IP locale ou `homeassistant.local` ne constitue pas une configuration OAuth Web utilisable. L’exception HTTP localhost sert uniquement au développement. Garder le même navigateur et la session Home Assistant ouverte pendant le retour OAuth. Le chemin Ingress contient une session : si elle change ou expire, actualiser l’URL dans Google Cloud et dans MyScheduler puis reconnecter. Cette V1 nécessite donc une configuration manuelle de l’URL ; elle ne fournit pas de relais OAuth externe. Si ton accès HA ne permet pas ce retour HTTPS, il faudra adapter le flux avant utilisation.

En mode **Testing**, Google limite généralement à sept jours les jetons de renouvellement pour les scopes Calendar : une reconnexion est alors nécessaire. Passer l’application en production pour une utilisation durable ; Google peut afficher un avertissement d’application non vérifiée selon sa configuration. Voir la [documentation OAuth Google](https://developers.google.com/identity/protocols/oauth2/web-server).

Les secrets et jetons sont stockés dans `/data/state.json`, avec permissions restreintes, et ne sont pas renvoyés à l’interface. Ils ne sont pas chiffrés sur disque : les sauvegardes de l’add-on contiennent ces secrets. Déconnecter supprime les jetons locaux et arrête les nouvelles commandes sans changer la consigne courante ; pour révoquer aussi l’autorisation Google, utiliser les connexions tierces du compte Google.

## Règles et comportement

- Exemple : titre contenant « Présence », entité `climate.salon`, température 21 °C, température après 17 °C, priorité 0.
- La simulation est activée à l’installation. Vérifier les actions calculées avant de la désactiver et d’enregistrer.
- Actualisation toutes les 60 secondes, événements des sept prochains jours et de la dernière journée. Les événements déjà en cours sont repris au démarrage ; les événements entièrement terminés pendant une panne ne sont pas rejoués.
- Récurrences développées par Google ; événements avec horaires uniquement. Les journées entières sont ignorées. Les dates avec décalage horaire sont comparées en temps absolu.
- Pour chaque thermostat, la priorité la plus élevée gagne. À égalité : identifiant de règle, puis identifiant d’événement. Quand le gagnant finit, une autre règle encore active prend le relais ; sinon la consigne finale du dernier gagnant est appliquée.
- Suppression d’un événement ou d’une règle active : application de sa consigne finale après synchronisation réussie. Même principe lors d’un changement de calendrier.
- Les erreurs Google n’entraînent aucune nouvelle commande ; les consignes existantes restent en place. Les erreurs HA sont retentées. L’état persistant permet de reprendre une règle après redémarrage. Une commande peut être répétée après un arrêt entre son envoi et la sauvegarde : `set_temperature` est idempotente.
- Une consigne manuelle n’est pas écrasée à chaque minute : l’add-on commande lors d’un changement de consigne calculée. Il ne commande ni le mode HVAC, ni les plages horaires internes des vannes. Les consignes doivent rester compatibles avec ton matériel.
- Activer la simulation suspend les commandes, y compris les consignes de fin. Les règles précédemment appliquées sont conservées pour réconciliation lorsque la simulation est désactivée.

L’interface présente les événements à venir et les commandes calculées lors de la dernière synchronisation. Elle ne fournit pas encore un historique d’exécution ni un calcul détaillé de toutes les futures actions. V1 limitée aux températures ; d’autres services HA pourront être ajoutés ensuite.

## Développement et vérification

Node.js 22 ou supérieur, sans dépendances npm :

```powershell
node --test tests/*.test.mjs
node myscheduler/server.mjs
```

Ouvrir `http://localhost:8099/`. Les données locales vont dans `data/` (ignoré par Git). Pour OAuth local, enregistrer `http://localhost:8099/oauth/callback` chez Google. Hors HAOS, garder la simulation : les commandes nécessitent le jeton Supervisor injecté par HAOS.

Tests du moteur : limites temporelles, fuseaux, priorités, reprise persistante, annulation, événements à la journée et validation. La connexion Google réelle et la commande de vraies vannes nécessitent ton installation.

Références : [configuration des add-ons](https://developers.home-assistant.io/docs/apps/configuration/), [API Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).
