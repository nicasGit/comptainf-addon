# 0.5.2

- Filtre mot-clé ET code hexadécimal personnalisé, par exemple #b3dc6c.
- Correspondance exacte sur la couleur affichée, propre à l’événement ou héritée du calendrier.
- Validation du format #RRGGBB, affichage du code dans les résumés et recherche.

# 0.5.1

- Affichage de pastilles de couleur et récupération de la couleur héritée du calendrier.
- Lecture des nouveaux libellés de couleur Google en complément des colorId historiques.
- Reconnaissance des couleurs standard des nouveaux libellés pour les filtres existants.
- Distinction entre couleur propre à l’événement, héritée du calendrier et non renseignée.

# 0.5.0

- Filtre optionnel mot-clé ET couleur de l’événement Google, dont Myrtille (bleu).
- Compatible avec les événements horaires ou toute la journée selon le mode de la règle.
- Couleur visible dans les événements et les résumés ; recherche par nom de couleur.
- Couleur explicite distinguée de celle héritée du calendrier ; règles existantes inchangées.

# 0.4.3

- Carte « État et prochaines échéances » placée avant les programmes.

# 0.4.2

- Choix du type d’événements par règle : avec horaires uniquement, avec horaires et journées entières, ou journées entières uniquement.
- Comportement des règles existantes conservé automatiquement.
- Chargement des entités déplacé dans une carte repliée en bas, avec nombre d’entités visible.

# 0.4.1

- Programmes et prochaines échéances placés en tête de page.
- Connexion Google et sélection des calendriers déplacées en bas dans deux cartes repliables.
- Cartes fermées une fois la connexion et la sélection configurées ; état et nombre de calendriers visibles.
- Bouton d’enregistrement directement dans la carte des calendriers.

# 0.4.0

- Programmes hebdomadaires indépendants du calendrier et du compte Google.
- Plusieurs programmes nommés, avec cartes repliables, jours/heures visibles, recherche et filtre par type.
- Mise en pause et duplication (copie en pause), modifications appliquées à l’enregistrement.
- Priorités communes entre les programmes hebdomadaires et calendrier.
- Les programmes hebdomadaires continuent pendant les erreurs Google ; les derniers gagnants calendaires sont conservés.

# 0.3.1

- Thème clair avec formulaires blancs et contrastes adaptés.
- Correspondances françaises des noms d’entités courants, notamment les réglages de radiateurs Zigbee.
- Recherche sur les noms français, d’origine et identifiants, sans distinction d’accents.
- Traduction des actions courantes, des modes et des états affichés ; identifiants et valeurs HA conservés.

# 0.3.0

- Événements Google toute la journée, activables par règle avec le même mot-clé.
- Plages par jour de semaine, heures de début/fin et fuseau horaire explicite.
- Plages traversant minuit et gestion des changements d’heure.
- Actions pendant, après ou spécifiques à une plage ; exemple vendredi/week-end/mercredi prérempli.
- Affichage des journées entières et rejet des plages qui se chevauchent.
- Comportement existant conservé tant que l’option journée entière reste désactivée.

# 0.2.0

- Règles génériques : recherche et choix d’une entité Home Assistant, puis action et paramètres distincts pendant et après l’événement.
- Découverte des actions et des champs depuis HA, listes de modes et valeurs numériques, paramètres JSON avancés.
- Affichage des attributs en lecture seule et vérification de la disponibilité avant exécution.
- Conversion automatique des anciennes règles de température et conservation du compte Google.
- Suivi des actions par occurrence d’événement et par phase.

# 0.1.2

- Correction du bouton « Ajouter une règle » sur les navigateurs sans `crypto.randomUUID`, notamment dans certains contextes HTTP ou Ingress.
- Identifiants compatibles avec les navigateurs plus anciens, sans changement des règles existantes.

# 0.1.1

- Sélection de plusieurs calendriers Google avec des cases à cocher.
- Combinaison des événements et affichage du calendrier d’origine.
- Priorités communes entre calendriers et conservation de la configuration 0.1.0.
- Aucune nouvelle commande en cas d’échec de lecture d’un calendrier sélectionné.

# 0.1.0

- Première version : OAuth Google, règles de température, simulation et interface Ingress.
