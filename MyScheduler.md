# MyScheduler · add-on Home Assistant OS

Connexion directe à Google Calendar en lecture seule, sélection de plusieurs calendriers du même compte et règles par mots-clés pour les entités Home Assistant : thermostats, lumières, interrupteurs, volets, ventilateurs et autres entités exposant des actions ciblées.

## Version 0.4.0 : programmes hebdomadaires et vue synthétique

**Ajouter un programme hebdomadaire** crée un programme récurrent indépendant du calendrier. Donner un nom, choisir l’entité et les actions pendant/après, puis définir les jours et les horaires. Par exemple lundi/mardi/mercredi de 07:00 à 22:00. Aucun compte Google ni mot-clé n’est nécessaire. Plusieurs programmes peuvent viser la même entité : la priorité la plus élevée gagne, comme pour les programmes calendrier.

Les programmes sont présentés en cartes repliables : nom, type, activation, priorité, entité et résumé des jours/heures. La recherche et le filtre par type permettent de retrouver un programme. Cliquer la carte pour modifier, utiliser **Tout replier** pour revenir à la synthèse. La duplication crée une copie en pause pour permettre son adaptation avant activation. Toutes les modifications, y compris pause et duplication, nécessitent **Enregistrer**.

Un programme hebdomadaire doit contenir au moins une plage. À la sortie, son action après s’applique sauf si un autre programme prend le relais. Une mise en pause d’un programme appliqué déclenche aussi la réconciliation vers le programme suivant ou son action après. Les plages de nuit, fuseaux et changements d’heure suivent les mêmes règles que les plages des journées entières.

Les programmes hebdomadaires continuent si Google est indisponible ou déconnecté. Les règles calendrier ne sont pas recalculées sur une réponse partielle : leur dernier gagnant appliqué est conservé jusqu’au retour de Google, à moins que la règle soit supprimée ou mise en pause. Ce gagnant conservé participe aux priorités avec les programmes hebdomadaires. Un candidat calendrier qui ne gagnait pas précédemment ne peut pas être retrouvé avant le retour de Google.

## Version 0.3.1 : thème clair et libellés français

L’interface utilise un thème clair. Les libellés anglais courants d’entités et les actions sont traduits dans MyScheduler, tout en gardant les identifiants Home Assistant visibles et inchangés. La recherche accepte le nom français, le nom d’origine ou l’identifiant, sans imposer les accents. Les noms personnalisés inconnus sont conservés ; aucun renommage n’est effectué dans HA. Les valeurs des options restent envoyées dans leur format d’origine.

Exemples pour les radiateurs : `Child lock` → Verrouillage enfant ; `Open window` → Détection de fenêtre ouverte ; `Frost protection temperature` → Température de protection antigel ; `Temperature sensor` → Capteur de température ; `Temporary mode duration` → Durée du mode temporaire ; `Valve closing degree` → Degré de fermeture de la vanne. Il s’agit de correspondances d’affichage ; les réglages mécaniques doivent être interprétés selon la documentation du modèle.

## Version 0.3.0 : événements toute la journée et plages par jour

Dans chaque règle, activer **Prendre en compte les événements « toute la journée »**, puis choisir le fuseau horaire (par défaut `Europe/Zurich`). Les événements avec horaires continuent d’utiliser leurs heures, indépendamment de ces plages. Les règles existantes gardent l’option désactivée après mise à jour.

Sans plage, l’action pendant s’applique de minuit au minuit final de l’événement. Avec des plages, chaque plage indique ses jours de début, son heure de début et de fin, et l’action à appliquer : action pendant, action après ou action spécifique avec ses propres paramètres. Une fin inférieure ou égale au début est située le lendemain ; deux heures identiques représentent 24 heures. Les chevauchements au sein d’une règle sont refusés, y compris entre deux jours ou dimanche et lundi.

Le bouton **Préremplir vendredi, week-end et mercredi** crée cet exemple à personnaliser :

| Début | Plage | Action |
| --- | --- | --- |
| Vendredi | 19:00–22:00 | Pendant, par exemple température haute |
| Samedi et dimanche | 07:00–22:00 | Pendant |
| Vendredi et samedi | 22:00–07:00 le lendemain | Après, par exemple température basse |
| Mercredi | 07:00–00:00 | Action spécifique à choisir, par exemple `climate.set_hvac_mode` avec `hvac_mode: off` |

Ces plages ne s’activent **que si un événement toute la journée contient le mot-clé** et couvre leur date de début. Un événement de plusieurs jours est traité pour chaque jour couvert. Une plage de nuit peut finir après la dernière date couverte par l’événement : un événement uniquement le vendredi autorise donc sa plage vendredi 22:00 → samedi 07:00, mais pas la plage de jour du samedi.

Avant la première plage, aucune nouvelle action n’est envoyée. À la fin d’une plage, l’action après est envoyée si aucune autre plage ou règle n’est active. Elle s’applique aussi après une plage spécifique : elle doit donc correspondre au comportement souhaité hors plages. Les plages sont des fenêtres actives, pas des commandes à rejouer si l’add-on était arrêté pendant toute la fenêtre.

Les frontières sont évaluées dans le fuseau choisi, même si le conteneur utilise UTC. Lors du passage à l’heure d’été, une heure inexistante est décalée vers l’avant de la durée du saut ; lors du passage à l’heure d’hiver, la première occurrence d’une heure répétée est retenue. La fin d’un événement Google en journée entière est exclusive. L’interface affiche aussi les événements toute la journée.

## Version 0.2.0 : actions génériques

L’éditeur charge les entités et les actions déclarées par Home Assistant. Pour chaque règle :

1. Saisir le mot-clé du titre et la priorité.
2. Rechercher une entité par son nom ou son identifiant, puis la sélectionner.
3. Choisir une action **Pendant l’événement** et renseigner ses paramètres.
4. Choisir indépendamment l’action **Après l’événement** et ses paramètres.
5. Enregistrer puis contrôler le résultat en simulation.

Exemples : `climate.set_temperature` à 21 °C puis à 17 °C ; `light.turn_on` à 60 % puis `light.turn_off` ; `switch.turn_on` puis `switch.turn_off` ; `cover.set_cover_position` à 80 puis à 20.

Les champs numériques, listes de choix et booléens utilisent les métadonnées HA. Les modes et options utilisent aussi les attributs de l’entité quand ils sont disponibles. Les valeurs complexes et les paramètres supplémentaires peuvent être saisis en JSON. Les attributs actuels sont affichés en lecture seule : on modifie l’appareil par ses actions, pas en écrivant arbitrairement un attribut. La validité finale des paramètres dépend de l’intégration HA et de l’appareil ; les sélecteurs complexes ne sont pas tous rendus nativement.

Les actions appartiennent au domaine de l’entité ou à `homeassistant`, avec ciblage d’entité déclaré. Les opérations globales sans cible et les actions de consultation avec réponse obligatoire sont exclues. La présence et la disponibilité de l’entité et de l’action sont vérifiées avant l’exécution réelle.

Les anciennes règles de thermostat sont converties automatiquement avec leurs consignes pendant/après ; le compte Google, les calendriers et les priorités sont conservés.

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

- Exemple : titre contenant « Présence », entité `climate.salon`, action `climate.set_temperature` avec température 21 pendant et 17 après, priorité 0.
- La simulation est activée à l’installation. Vérifier les actions calculées avant de la désactiver et d’enregistrer.
- Actualisation toutes les 60 secondes, événements des sept prochains jours et de la dernière journée. Les événements déjà en cours sont repris au démarrage ; les événements entièrement terminés pendant une panne ne sont pas rejoués.
- Récurrences développées par Google. Les événements avec horaires sont comparés en temps absolu ; les événements toute la journée suivent l’option et le fuseau propres à chaque règle.
- Pour chaque entité, la priorité la plus élevée gagne. À égalité : identifiant de règle, puis identifiant d’événement. Quand le gagnant finit, une autre règle encore active prend le relais ; sinon l’action après du dernier gagnant est exécutée. Une seule règle gagne par entité, même si des règles concernent des paramètres différents.
- Suppression d’un événement ou d’une règle active : exécution de son action après, une fois la synchronisation réussie. Même principe lors d’un changement de calendrier.
- Les erreurs Google conservent les dernières actions calendaires et n’arrêtent pas les programmes hebdomadaires. Les erreurs HA sont retentées. L’état persistant permet de reprendre une règle après redémarrage. Une commande peut être répétée après une coupure entre son envoi et la sauvegarde : préférer des actions explicites telles que `turn_on`, `turn_off` et `set_temperature`, plutôt que `toggle` ou une action irréversible. Il n’y a pas de garantie « exactement une fois ».
- L’action pendant est exécutée à l’activation, au changement du gagnant ou de ses paramètres, puis mémorisée : elle n’est pas renvoyée toutes les minutes. Chaque nouvelle occurrence d’événement peut déclencher l’action, même avec les mêmes paramètres. L’action après ne restaure pas automatiquement l’état précédent.
- Activer la simulation suspend les commandes, y compris les actions après. Les règles précédemment appliquées sont conservées pour réconciliation lorsque la simulation est désactivée.

L’interface présente les événements à venir et les commandes calculées lors de la dernière synchronisation. Elle ne fournit pas encore un historique d’exécution ni un calcul détaillé de toutes les futures actions. Chaque phase d’une règle contient une action sur une entité ; pour plusieurs entités, créer plusieurs règles.

## Développement et vérification

Node.js 22 ou supérieur, sans dépendances npm :

```powershell
node --test tests/*.test.mjs
node myscheduler/server.mjs
```

Ouvrir `http://localhost:8099/`. Les données locales vont dans `data/` (ignoré par Git). Pour OAuth local, enregistrer `http://localhost:8099/oauth/callback` chez Google. Hors HAOS, garder la simulation : les commandes nécessitent le jeton Supervisor injecté par HAOS.

Tests du moteur : limites temporelles, fuseaux et changements d’heure, plages quotidiennes et nocturnes, priorités, reprise persistante, annulation, événements à la journée et validation. La connexion Google réelle et la commande de vraies vannes nécessitent ton installation.

Références : [configuration des add-ons](https://developers.home-assistant.io/docs/apps/configuration/), [API Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).
