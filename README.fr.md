# SwiftCoder

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | Français | [Deutsch](README.de.md)

SwiftCoder est un agent de programmation IA léger pour macOS, propulsé par [SwiftScale](https://swift-scale.com). Il transforme une demande en langage naturel en un flux de travail local maîtrisé : comprendre le dépôt, planifier le travail, inspecter et modifier les fichiers, exécuter des commandes, examiner les changements et vérifier le résultat.

SwiftCoder associe une application de bureau Electron, un espace de travail SolidJS ciblé et un Agent Server TypeScript intégré dérivé d'OpenCode. Le client est ouvert, inspectable et local par défaut, tandis que SwiftScale fournit l'identité, les droits du compte, l'accès aux modèles, le routage et les services IA commerciaux.

## Positionnement

SwiftCoder est le point d'entrée de bureau de SwiftScale pour les développeurs. Il est conçu pour travailler dans un dépôt existant, et non pour enchaîner des conversations isolées de type question-réponse.

SwiftCoder est :

- un AI Coding Agent capable de conduire une tâche de l'analyse du dépôt jusqu'à l'implémentation et la vérification ;
- un espace de travail macOS à l'expérience native pour les projets, sessions de programmation, conversations indépendantes, différences, tâches et activités du terminal ;
- un accès sans configuration aux modèles et à la capacité disponibles pour un compte SwiftScale ;
- un client de bureau open source avec des limites explicites pour l'exécution locale et les autorisations.

SwiftCoder n'a pas vocation à remplacer un IDE complet, à masquer les actions autonomes ni à devenir un client de discussion généraliste. Les éditeurs et IDE restent l'environnement principal pour l'écriture détaillée du code ; SwiftCoder se concentre sur la délégation et la supervision de tâches d'ingénierie complètes.

## Principes du produit

- **Le projet d'abord.** Les projets et leurs sessions sont des objets de premier plan. SwiftCoder part du dépôt et de son état réel, pas d'une zone de discussion vide.
- **Agentique, mais contrôlé.** L'agent peut exécuter plusieurs étapes, tandis que les opérations sensibles sur les fichiers, le Shell, le réseau et le système restent visibles et soumises à une politique d'autorisation.
- **Local par défaut.** L'accès au dépôt, les outils, les commandes, les différences et l'état des sessions sont traités localement. Seul le contexte nécessaire à l'inférence IA est envoyé à SwiftScale.
- **Travail vérifiable.** Les plans, appels d'outils, commandes, changements, erreurs et résultats de validation apparaissent dans une chronologie traçable.
- **Accès aux modèles lié au compte.** Le mode produit et le catalogue de modèles proviennent des droits du compte SwiftScale connecté, et non d'une liste codée en dur.
- **Surface produit ciblée.** SwiftCoder privilégie un flux de programmation compact plutôt que l'exposition de tous les fournisseurs, paramètres ou composants amont.

## Fonctionnalités principales

- Organiser les projets locaux et leurs sessions de programmation, avec un espace distinct pour les conversations indépendantes.
- Comprendre un dépôt grâce à la recherche de fichiers, l'inspection du contenu, les instructions du projet, l'état Git et le contexte de session.
- Créer et modifier plusieurs fichiers, présenter les différences et permettre l'examen ou l'annulation des changements.
- Exécuter des commandes, diffuser leur sortie, arrêter les travaux longs et résumer les vérifications de types, tests, compilations et autres validations.
- Afficher les plans, la progression, l'activité des outils, les résultats générés et les erreurs exploitables dans un espace de travail ciblé.
- Se connecter via SwiftScale OAuth et stocker les identifiants dans le trousseau macOS.
- Adapter le mode produit et les modèles au Coding Plan, à API Services ou aux droits combinés. La disponibilité des modèles est fournie par le plan de contrôle SwiftScale.
- Isoler sur l'appareil les projets et l'historique des conversations selon le compte connecté.

## Vision

Créer l'assistant de programmation IA le plus léger, le plus élégant et le plus intelligent au monde.

SwiftCoder veut offrir aux développeurs une nouvelle expérience de programmation avec l'IA :

- **Légère (Lightweight)**
- **Simple (Simple)**
- **Fiable (Reliable)**
- **Open source (Open Source)**
- **Intelligente (Intelligent)**

SwiftCoder ne veut pas devenir un IDE de plus en plus complexe, mais l'AI Coding Agent que les développeurs ouvrent naturellement chaque jour.

Notre objectif est de rendre les agents de programmation réellement pratiques au quotidien : faciles à démarrer, assez puissants pour accomplir un travail significatif et assez transparents pour inspirer confiance dans un dépôt réel.

SwiftCoder relie également un agent de bureau ouvert à la plateforme IA SwiftScale. À mesure que les modèles, le routage, la capacité et les fonctions d'équipe évoluent, le client doit offrir un accès cohérent sans imposer aux développeurs de reconstruire leur flux de travail pour chaque fournisseur. Le succès ne se mesure pas au volume de texte produit, mais à la fiabilité avec laquelle l'intention devient du code examiné et vérifié.

## Fonctionnement

```text
Développeur
   |
   v
SwiftCoder Desktop (projets, sessions, chronologie, différences, terminal)
   |
   +--> Agent Server local (contexte, outils, autorisations, persistance)
   |         |
   |         +--> Espace local / Git / Shell
   |
   +--> SwiftScale (identité, droits, routage des modèles, inférence)
```

## Prérequis

- macOS 13 ou version ultérieure
- Bun 1.3.14
- Node.js 22.22.2 ou version ultérieure
- Xcode Command Line Tools

## Développement

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

Pour des builds locaux reproductibles, les outils reconnaissent également le binaire Bun du dépôt dans `.tools/bun`.

Exécuter avec l'environnement de développement SwiftScale déployé :

```bash
./tools/run-dev-cloud.sh
```

Compiler le moteur de rendu et l'Agent Server intégré sans lancer Electron :

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

Exécuter la vérification complète de l'implémentation actuelle :

```bash
./tools/check-phase4.sh
```

## Vérifications avant publication open source

Générer et vérifier l'inventaire des licences de dépendances avant de publier le code source ou les artefacts de bureau :

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

Les binaires générés, dépendances, états locaux, identifiants, journaux, résultats de tests et éléments de signature sont exclus par `.gitignore`. Ne contournez pas ces règles par un envoi manuel du répertoire ; publiez depuis un index Git vérifié.

Pour une version macOS signée, `bun run release:preflight` exécute les contrôles du code public et de sécurité des dépendances avant de vérifier les identifiants de signature Apple.

Construire, signer, notarier et vérifier l'application macOS de production avec les identifiants conservés hors du dépôt dans `~/.config/swiftcoder/release.env` :

```bash
./tools/package-mac-release.sh
```

Créer une version de test interne configurée pour la production, avec signature ad-hoc et sans notarisation Apple :

```bash
./tools/package-mac-release.sh prod --local-test
```

Les artefacts de test locaux ne peuvent jamais être publiés sur un canal de mise à jour public.

## Organisation du code source

- `packages/desktop` : processus principal Electron, Preload, empaquetage et point d'entrée du moteur de rendu.
- `packages/app` : interface de l'espace de travail SolidJS.
- `packages/opencode` : Agent Server TypeScript intégré conservé depuis la base amont.
- `packages/core`, `packages/schema`, `packages/protocol` : domaine Agent partagé et contrats API.
- `packages/ui`, `packages/session-ui` : interface et composants de chronologie de l'Agent.
- `tools` : automatisation du développement, des vérifications, de l'empaquetage et des versions.
- `script` : utilitaires de maintenance amont conservés en attente de consolidation.
- `UPSTREAM_BASELINE.json` : provenance amont exacte et liste des paquets conservés.

La compilation ne lit pas `../opencode` ; ce répertoire sert uniquement de référence amont.

## Licence et attribution

Le code source de SwiftCoder est publié sous la licence MIT du fichier `LICENSE`. Des parties importantes sont dérivées d'OpenCode et conservent le copyright amont et la notice MIT dans `THIRD_PARTY_NOTICES.md` et `legal/OpenCode-LICENSE.txt`.

Les licences des dépendances et ressources sont documentées dans :

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

La licence du code source n'accorde aucun droit d'utiliser les marques SwiftScale ou SwiftCoder pour une distribution modifiée.

## Sécurité

Ne signalez pas une vulnérabilité présumée dans une Issue publique. Suivez les instructions de signalement privé dans `SECURITY.md`.

Les règles de contribution et d'assistance sont décrites dans `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` et `SUPPORT.md`.
