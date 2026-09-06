# Apogée

Tableau de bord de l'activité de vol SpaceX : prochains départs, archives, matériel réutilisé et charges
utiles. Interface en français, consultable sans compte, construite sur **Launch Library 2** (The Space Devs).

Le principe directeur : ne jamais afficher plus que ce que la source publie. Une donnée absente est signalée
comme telle, une date approximative reste approximative, et aucune donnée de démonstration ne se substitue à
une source indisponible.

---

## Démarrer

```bash
npm install
npm run data     # récupère l'instantané Launch Library et construit data/spacex.db
npm run dev      # http://localhost:3000
```

`data/` n'est pas versionné : c'est un artefact de build. Sans lui, l'application démarre et affiche un état
« source indisponible » explicite plutôt qu'un écran vide.

## Scripts

| Commande                          | Rôle                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `npm run data`                    | `sync` puis `build:db`                                                            |
| `npm run sync`                    | Récupère les pages brutes LL2 dans `data/raw/`                                    |
| `npm run sync:since`              | Récupère uniquement ce que la source a modifié depuis la dernière synchronisation |
| `npm run build:db`                | Normalise `data/raw/` vers `data/spacex.db`                                       |
| `npm run dev` / `build` / `start` | Next.js                                                                           |
| `npm test`                        | Suite Vitest sur la couche domaine                                                |
| `npm run lint` / `format`         | ESLint / Prettier                                                                 |

---

## Architecture des données

```
Launch Library 2 (ll.thespacedevs.com/2.3.0)
        │  scripts/fetch-raw.mjs      15 req/h, reprise sur 429
        ▼
data/raw/*.json                        pages brutes, telles que reçues
        │  scripts/build-db.ts         normalisation, règles métier
        ▼
data/spacex.db                         SQLite + FTS5
        │  src/lib/db/*                requêtes en lecture seule
        ▼
Next.js (App Router, RSC)
```

**Pourquoi une base locale.** L'API limite à 15 requêtes par heure sans clé. Le brief demande des filtres
combinables, des totaux portant sur le catalogue complet, une recherche par numéro de booster et un historique
de réutilisation. Rien de tout cela n'est tenable en interrogeant la source à chaque requête. La
synchronisation aspire une fois les 851 vols SpaceX (environ 15 requêtes), puis `npm run sync:since` suffit à
entretenir l'instantané pour une requête.

Pour développer sans quota, l'environnement de dev de la source est utilisable, au prix de données figées et
d'une couverture réduite :

```bash
LL2_BASE=https://lldev.thespacedevs.com/2.3.0 npm run data
```

---

## Couverture réelle de la source

Vérifiée sur l'API de production, pas seulement sur son miroir de dev.

| Donnée                       | Couverture                                                                                      | Conséquence                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Vols SpaceX                  | 851, de Falcon 1 (2006) à aujourd'hui                                                           | Catalogue complet                                     |
| Exemplaires de premier étage | 775 vols sur 851, 128 numéros de série distincts                                                | Historique de réutilisation exploitable               |
| Précision de date            | 468 à la seconde, 74 à la minute, 31 au mois, 46 à l'année, 15 à la décennie, 187 non précisées | Gestion de l'imprécision obligatoire, pas optionnelle |
| Récupérations                | 670 réussies, 28 échouées, 53 sans tentative, 24 sans résultat publié                           | Trois issues distinctes, plus l'absence de tentative  |
| Vaisseaux                    | 84 vols, 176 sièges d'équipage                                                                  | Bloc équipage réel                                    |
| Écussons de mission          | 709 sur 851                                                                                     | Affichés quand ils existent                           |
| **Charges utiles**           | **52 charges utiles et 60 vols de charge utile pour l'ensemble du catalogue mondial**           | **Section volontairement maigre**                     |

La dernière ligne est la limite structurante du projet. L'endpoint `payloads/` de LL2 est quasiment vide : la
très grande majorité des vols n'a aucune entrée détaillée. Le catalogue des charges utiles a donc été construit
sur ce qui existe réellement (`payload_flights`, vaisseaux Dragon et Starship, orbite visée, opérateur,
description de mission) et affiche cette limite en tête de page plutôt que de la combler.

Autres écarts assumés :

- **Vols annulés.** Le brief prévoit un filtre dédié. Les statuts LL2 présents dans ces données ne comportent
  pas d'état « annulé » : le filtre couvre les statuts réellement publiés.
- **Chronologie de vol.** LL2 fournit un profil _prévu_ (décalages relatifs à T-0), jamais d'heure réelle par
  étape. Le bloc est donc étiqueté comme prévisionnel et aucune chronologie factuelle n'en est déduite.
- **Résultats de déploiement.** Non publiés séparément du résultat de lancement ; la fiche le dit au lieu de
  réutiliser le résultat du lanceur.

---

## Règles métier

Elles vivent dans `src/lib/domain/` et sont couvertes par la suite de tests.

**Précision des dates** (`precision.ts`). Chaque vol est stocké comme un intervalle `[date_lo, date_hi)` plus
la précision qui l'a produit. Une mission annoncée « T3 2027 » n'affiche jamais de jour, ne déclenche pas de
compte à rebours, et une recherche par période la retient si son intervalle chevauche la période. Les dates
grossières sont regroupées sous un séparateur explicite au lieu d'être triées comme si elles tombaient le
1er janvier.

**Programmation contre résultat** (`status.ts`). `phase` répond à « le lanceur a-t-il quitté le pas de tir »,
`outcome` à « comment l'ascension s'est terminée ». Aucun des deux n'est déduit de l'horloge : une heure cible
dépassée ne transforme pas une mission en vol effectué. À zéro, le compte à rebours passe à « en attente de
confirmation ».

**Récupération** (`status.ts`). Axe séparé, par exemplaire physique. Une absence de tentative n'est pas un
échec. Un lancement réussi coexiste avec une récupération ratée, et un Falcon Heavy porte trois résultats
distincts.

**Compteurs.** « 3e vol de cet exemplaire » est le rang enregistré pour _cette_ mission, pas le total actuel du
booster. Les fiches distinguent « vols répertoriés » dans cet instantané du total revendiqué par la source. Un
vol à plusieurs boosters compte pour un vol et plusieurs participations de matériel.

**Indicateurs.** Chaque chiffre de la vue d'ensemble ouvre exactement l'ensemble qu'il résume, avec la même
période et les mêmes filtres. Aucun taux de réussite n'est affiché sans dénominateur explicite.

---

## Structure

```
scripts/
  fetch-raw.mjs          pull rate-limité et reprenable
  build-db.ts            normalisation vers SQLite
src/
  lib/
    domain/              précision de date, statuts, formatage, périodes
    db/                  schéma et requêtes en lecture seule
    ll2/                 typage de la tranche d'API consommée
    catalog-params.ts    état du catalogue encodé dans l'URL
  components/
    chrome/              navigation, recherche transversale, fuseau, fraîcheur
    launch/              fiche de vol : matériel, charges utiles, chronologie, webcast
    catalog/ hardware/ payload/   filtres et pagination
    viz/                 starfield, cadence, indicateurs, répartitions
    ui/                  primitives, statuts, dates, imagerie
  app/                   routes App Router
tests/                   Vitest sur la couche domaine
```

## État de l'interface et accessibilité

Chargement, résultat vide, erreur temporaire, donnée indisponible et fiche introuvable ont chacun un état
dédié. Aucun n'est remplacé silencieusement par des données de démonstration.

Le statut n'est jamais porté par la couleur seule : chaque pastille associe un glyphe, une couleur et un
libellé écrit. Navigation au clavier de bout en bout, `⌘K` pour la recherche transversale, focus visible,
tableaux défilants isolés, et respect de `prefers-reduced-motion`.

Le fuseau horaire est choisi par le visiteur et conservé localement ; les instants restent stockés en UTC et
l'UTC reste accessible au survol. Aucun compte, aucune donnée envoyée nulle part.

---

## Déploiement

Le Dockerfile produit une image autonome : serveur Next en sortie `standalone`, plus
les deux outils du pipeline de données pré-bundlés en JavaScript simple sous
`dist/tools/`, donc ni TypeScript ni dépendances de développement au runtime.

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://apogee.gregoryklein.io -t apogee .
docker run -p 3000:3000 -v apogee-data:/app/data apogee
```

`NEXT_PUBLIC_SITE_URL` doit être fournie **au build**, pas seulement au runtime : les
variables `NEXT_PUBLIC_*` sont inlinées à la compilation. Sans elle, le sitemap et les
métadonnées Open Graph annonceraient `localhost`.

Le volume `/app/data` doit être monté sur un stockage persistant. Sans lui, l'instantané
disparaît à chaque reconstruction de l'image.

### Amorçage du premier déploiement

`data/` n'est pas versionné. Au premier démarrage l'application répond correctement mais
affiche « source indisponible », ce qui est le comportement voulu : aucune donnée de
démonstration ne se substitue à une source absente.

**Depuis le conteneur**, si l'on peut attendre le quota horaire :

```bash
node dist/tools/fetch-raw.mjs && node dist/tools/build-db.mjs
```

**Depuis une machine locale**, immédiat : construire la base en local (`npm run data`)
puis copier les 8 Mo dans le volume.

```bash
docker cp data/spacex.db <conteneur>:/app/data/spacex.db
```

### Mise à jour de la base

L'instantané ne se met pas à jour tout seul. Une tâche planifiée quotidienne, par
exemple via cron dans le conteneur ou l'ordonnanceur de la plateforme d'hébergement,
suffit :

```bash
node dist/tools/fetch-raw.mjs --since && node dist/tools/build-db.mjs
```

`--since` ne demande à la source que les missions modifiées depuis la dernière
synchronisation réussie, ce qui coûte en général **une seule requête** et reste très
loin du plafond horaire. Un report de lancement arrive par ce canal : la mission garde
son identité et son URL, seule sa date change.

Le remplacement du fichier est **atomique et à chaud**. `build-db` écrit dans
`spacex.db.building` puis le renomme par-dessus la cible ; le serveur continue de servir
l'ancien fichier jusqu'à la bascule, détecte le nouvel inode au contrôle suivant et
rouvre sa connexion. Aucun redémarrage, aucune requête servie sur une base à moitié
écrite.

La date de dernière synchronisation réussie est affichée en pied de page, distincte de
la date de dernière modification côté source.

### Une seule instance

L'application lit un fichier SQLite local : elle se déploie en instance unique. Le
profil d'usage s'y prête, lecture seule et un seul écrivain, mais plusieurs replicas
demanderaient une base partagée. La couche `src/lib/db/` est isolée pour rendre ce
changement possible sans toucher à l'interface.

---

## Source

Données : [Launch Library 2](https://ll.thespacedevs.com/) par [The Space Devs](https://thespacedevs.com).
Reproduites telles que publiées. Ce tableau de bord n'effectue aucun suivi orbital et ne diffuse pas de
télémétrie en direct.

## Licence

Code sous licence [MIT](LICENSE). Cette licence couvre le code de ce dépôt, pas les données qu'il affiche :
les textes, images et écussons de mission servis par Launch Library 2 restent la propriété de leurs auteurs
respectifs et de The Space Devs, sous leurs propres conditions.
