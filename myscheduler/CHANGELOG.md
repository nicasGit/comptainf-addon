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
