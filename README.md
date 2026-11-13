# NJOSoftware Add-ons

Dépôt de modules complémentaires pour Home Assistant OS.

## Installation

Dans Home Assistant : **Paramètres → Modules complémentaires → Boutique des modules complémentaires → ⋮ → Dépôts**. Ajouter :

```text
https://github.com/nicasGit/comptainf-addon
```

Actualiser la boutique, puis installer le module souhaité dans **NJOSoftware Add-ons**.

## Modules

- **ComptaInf** : comptabilité pour infirmière indépendante.
- **MyCompta** : dépenses et documents du foyer avec Google Sheets et Drive.
- **MyScheduler** : actions sur les entités Home Assistant depuis plusieurs calendriers Google personnels. Choix de l’entité, actions et paramètres pendant/après, priorités et simulation activée par défaut. [Installation et configuration Google](./MyScheduler.md).

MyScheduler est une première version : la connexion Google et les commandes réelles restent à valider sur HAOS. Un accès HTTPS à Home Assistant est nécessaire pour son retour OAuth.

## Tests MyScheduler

Avec Node.js 22 ou supérieur :

```sh
node --test tests/*.test.mjs
```
