# PRD — GOAL-IA CONTENT ENGINE

## Prototype personnel d'automatisation de contenu, publication et apprentissage

**Version :** 2.0
**Date :** 01/09/2026
**Statut :** À construire
**Projet :** Prototype personnel pour accélérer l'acquisition de Goal-IA

---

# 1. VISION

Construire une machine personnelle capable de transformer une idée ou une donnée marketing en contenu vidéo prêt à publier, puis d'analyser les résultats pour améliorer automatiquement les prochains contenus.

L'objectif n'est pas simplement de générer des scripts.

L'objectif est de construire une **machine de production + publication + mesure + apprentissage**.

Pipeline global :

```text
DONNÉES
↓
ANALYSE
↓
STRATÉGIE
↓
ANGLE
↓
HOOK
↓
SCRIPT
↓
VOIX OFF
↓
SÉLECTION DES ASSETS
↓
STYLE VISUEL
↓
TEMPLATE
↓
MONTAGE
↓
CONTRÔLE QUALITÉ
↓
EXPORT
↓
STOCKAGE
↓
VALIDATION HUMAINE
↓
PUBLICATION / PROGRAMMATION
↓
RÉSULTATS
↓
ANALYSE
↓
APPRENTISSAGE
↓
NOUVELLE STRATÉGIE
```

---

# 2. OBJECTIF DU PROTOTYPE

Le système doit permettre progressivement à l'utilisateur de passer de :

```text
Idée
+
Script
+
Montage manuel
+
Publication manuelle
+
Analyse manuelle
```

à :

```text
Idée
↓
Machine
↓
Validation
↓
Publication
↓
Résultats
↓
Machine apprend
```

Le système est initialement destiné uniquement à l'utilisateur et à Goal-IA.

Il n'est pas conçu comme un SaaS commercial dans cette première version.

---

# 3. STACK TECHNIQUE

## 3.1 Langage

* TypeScript
* JavaScript uniquement lorsque nécessaire

---

# 3.2 Framework

**Next.js**

Architecture App Router.

Next.js sert de :

* backend
* API
* interface minimale
* orchestration
* endpoints
* logique applicative

---

# 3.3 Hébergement

**Vercel**

Objectif :

* gratuit au départ
* déploiement rapide
* variables d'environnement
* API
* cron lorsque pertinent

⚠️ Les traitements vidéo lourds ne doivent pas être forcés dans Vercel si ses limites techniques les rendent peu fiables.

---

# 3.4 Base de données

**Supabase / PostgreSQL**

Supabase constitue la **mémoire structurée du Content Engine**.

Il stocke notamment :

* idées
* angles
* hooks
* scripts
* prompts
* variantes
* templates
* caractéristiques des montages
* notes de qualité
* publications
* plateformes
* dates de publication
* métriques
* watchtime
* engagement
* rétention
* expériences
* apprentissages
* décisions
* rapports
* logs

Supabase ne sert pas à stocker les gros fichiers vidéo.

---

# 3.5 Stockage des vidéos

**Cloudflare R2**

R2 constitue le stockage principal des fichiers lourds.

Stocker notamment :

* vidéos originales
* vidéos intermédiaires si nécessaire
* voix off
* vidéos finales
* previews
* exports
* éventuellement images/B-roll lourds

Exemple :

```text
Cloudflare R2

/content/2026/09/01/CONTENT-001/
    final.mp4
    preview.mp4
    voice.mp3
```

Une vidéo finale possède une URL/référence stockée dans Supabase.

Architecture :

```text
VIDEO
↓
Cloudflare R2

MÉTADONNÉES
↓
Supabase
```

---

# 3.6 IA

IA principale :

**DeepSeek API**

Utilisation :

* analyse marketing
* stratégie
* recherche d'angles
* hooks
* scripts
* variantes
* analyse des performances
* apprentissage
* rapports
* recommandations
* conversation WhatsApp

Principe :

> Ne jamais utiliser DeepSeek lorsqu'une logique déterministe suffit.

Exemple :

```text
Calcul métrique → code
Tri → code
Statistique → code
Détection statut → code
Analyse marketing → DeepSeek
Décision stratégique → DeepSeek + règles
```

Objectif :

**minimiser les tokens sans sacrifier la qualité.**

---

# 3.7 Génération vocale

**ElevenLabs**

Utilisation :

* voix off
* génération audio
* variantes de voix si nécessaire

Architecture :

```text
Voice Engine
↓
Voice Provider
↓
ElevenLabs
```

Le provider doit être abstrait afin de pouvoir changer de fournisseur plus tard.

---

# 3.8 Montage vidéo

Technologie privilégiée :

**FFmpeg**

Utilisation :

* assemblage
* découpage
* concaténation
* voix off
* musique
* sous-titres
* redimensionnement
* format vertical
* transitions lorsque possible
* export MP4

Architecture :

```text
Video Engine
↓
Render Engine
↓
FFmpeg
```

Si le rendu est trop lourd pour Vercel :

```text
Vercel
↓
Worker vidéo
↓
FFmpeg
↓
Cloudflare R2
```

Le worker doit être choisi selon :

1. coût minimal
2. simplicité
3. fiabilité
4. temps de rendu

---

# 3.9 Réseaux sociaux

Priorité :

### TikTok

API officielle lorsque possible.

### Facebook

Meta Graph API lorsque possible.

Si l'intégration directe est trop complexe :

→ rechercher un intermédiaire adapté.

Exemples à évaluer :

* Buffer
* Hootsuite
* autre outil compatible

Le choix doit être basé sur :

* coût
* simplicité
* API
* automatisation
* limites
* fiabilité

Ne pas ajouter un intermédiaire sans nécessité.

---

# 3.10 WhatsApp

WhatsApp est l'interface principale de contrôle humain.

Utiliser l'API officielle WhatsApp Business / Meta lorsque possible.

Le système doit permettre :

* rapports
* notifications
* validation
* commandes
* idées personnalisées
* questions naturelles
* demandes de modification

Exemples :

```text
"Teste cette idée"

"Fais cette vidéo"

"Fais 3 variantes"

"Qu'est-ce qui a marché aujourd'hui ?"

"Pourquoi cette vidéo a mal marché ?"

"Publie celle-ci"

"Arrête la publication demain"
```

---

# 3.11 GitHub

GitHub :

* code
* versionnement
* documentation
* historique
* branches

Jamais stocker :

* clés API
* tokens
* secrets
* `.env`

---

# 4. ARCHITECTURE DES MODULES

```text
/src

    /engines
        strategy-engine
        angle-engine
        hook-engine
        script-engine
        asset-engine
        visual-engine
        template-engine
        voice-engine
        video-engine
        quality-engine
        publishing-engine
        analytics-engine
        learning-engine
        report-engine

    /providers
        deepseek
        elevenlabs
        whatsapp
        tiktok
        facebook
        supabase
        cloudflare-r2

    /lib
        database
        storage
        scheduler
        logger
        metrics
```

Chaque provider externe doit être isolé.

---

# 5. FLUX COMPLET

```text
DATA
 ↓
STRATEGY ENGINE
 ↓
ANGLE ENGINE
 ↓
HOOK ENGINE
 ↓
SCRIPT ENGINE
 ↓
VOICE ENGINE
 ↓
ASSET ENGINE
 ↓
VISUAL ENGINE
 ↓
TEMPLATE ENGINE
 ↓
VIDEO ENGINE
 ↓
QUALITY ENGINE
 ↓
EXPORT
 ↓
CLOUDFLARE R2
 ↓
READY_FOR_APPROVAL
 ↓
WHATSAPP
 ↓
APPROVED
 ↓
PUBLISHING ENGINE
 ↓
TIKTOK / FACEBOOK
 ↓
RESULTS
 ↓
ANALYTICS ENGINE
 ↓
LEARNING ENGINE
 ↓
STRATEGY ENGINE
```

---

# 6. CONTENT ENGINE

Le moteur de contenu gère :

* sujets
* angles
* hooks
* scripts
* CTA
* variantes
* templates
* styles visuels
* expériences

Deux modes.

## Mode automatique

Le moteur choisit les contenus à produire selon les données.

## Mode personnalisé

L'utilisateur envoie une idée via WhatsApp.

Exemple :

```text
Utilisateur :
"Teste cette idée : les parieurs composent des coupons trop chargés."

↓
Analyse

↓
Recommandation

↓
Utilisateur :
"Fais-la"

↓
Production
```

---

# 7. PRODUCTION DE CONTENU

Format initial :

* vidéo verticale
* 30–60 secondes
* voix off
* B-roll
* captures Goal-IA
* sous-titres
* musique lorsque pertinente
* CTA

Objectif initial :

**jusqu'à 10 vidéos par jour**

Mais la priorité est :

**qualité > volume.**

---

# 8. ASSETS

L'utilisateur fournit :

1. vidéos Goal-IA
2. captures Goal-IA
3. logos
4. B-roll
5. musiques
6. templates

Structure logique :

```text
/assets

    /goal-ia
    /screenshots
    /app-videos
    /broll
    /music
    /logos
    /templates
```

Le moteur doit chercher en priorité dans les assets existants.

---

# 9. GESTION DES ASSETS MANQUANTS

Le système ne doit jamais inventer un asset.

Il doit :

```text
chercher
↓
trouver
↓
utiliser
```

ou :

```text
chercher
↓
introuvable
↓
signaler sur WhatsApp
```

Exemple :

```text
⚠️ ASSET MANQUANT

Il manque :
B-roll vertical d'une personne utilisant son téléphone.

Action :
Télécharger un B-roll adapté sur Pixabay.

Statut :
Vidéo bloquée jusqu'à résolution.
```

---

# 10. VISUAL ENGINE

Le Visual Engine détermine **comment le script doit être transformé visuellement**.

Il choisit notamment :

* rythme
* alternance B-roll / Goal-IA
* durée des scènes
* quantité de texte à l'écran
* placement des captures
* zooms
* crops
* transitions
* sous-titres
* intensité visuelle
* placement du CTA
* densité visuelle

Exemple :

```text
HOOK
→ texte fort + changement rapide

PROBLÈME
→ B-roll

DÉMONSTRATION
→ capture Goal-IA

EXPLICATION
→ capture + texte

CTA
→ Goal-IA + texte final
```

---

# 11. APPRENTISSAGE DU STYLE VISUEL

Le système ne doit pas seulement apprendre quels scripts fonctionnent.

Il doit également apprendre **quels styles de montage produisent de meilleurs résultats**.

Pour chaque vidéo, enregistrer dans Supabase :

```text
template
hook_duration
scene_count
average_scene_duration
broll_ratio
goal_ia_ratio
text_overlay_ratio
subtitle_style
transition_frequency
zoom_frequency
music_used
voice_duration
video_duration
cta_position
```

Puis associer ces caractéristiques aux performances :

```text
views
likes
comments
shares
watchtime
retention
completion
```

Le Learning Engine cherche progressivement les corrélations.

Exemple :

```text
STYLE A
Engagement élevé
Rétention élevée

STYLE B
Engagement moyen
Rétention moyenne

STYLE C
Engagement faible
Rétention faible
```

Le système peut ensuite favoriser progressivement les caractéristiques du Style A.

⚠️ Il ne doit jamais considérer un style comme « gagnant » sur un échantillon trop faible.

---

# 12. TEMPLATE ENGINE

Les templates doivent être réutilisables.

Exemple :

### Template Problem → Solution

```text
HOOK
↓
PROBLÈME
↓
DÉMONSTRATION
↓
SOLUTION
↓
CTA
```

### Template Erreur → Conséquence → Solution

```text
HOOK
↓
ERREUR
↓
CONSÉQUENCE
↓
GOAL-IA
↓
CTA
```

### Template Démonstration

```text
HOOK
↓
SITUATION
↓
CAPTURE GOAL-IA
↓
DÉMONSTRATION
↓
RÉSULTAT
↓
CTA
```

### Template Comparaison

```text
ANCIEN COMPORTEMENT
↓
PROBLÈME
↓
NOUVEAU COMPORTEMENT
↓
GOAL-IA
↓
CTA
```

Le Visual Engine peut modifier les paramètres du template selon les apprentissages.

---

# 13. SYSTÈME DE RENDU

```text
SCRIPT
↓
SCÈNES
↓
TEMPLATE
↓
STYLE VISUEL
↓
ASSETS
↓
VOIX OFF
↓
MUSIQUE
↓
SOUS-TITRES
↓
FFMPEG
↓
MP4
```

---

# 14. EXPORT ET STOCKAGE

Chaque vidéo finalisée doit être exportée en MP4.

Après export :

```text
VIDEO FINAL
↓
CLOUDFLARE R2
↓
URL / FILE ID
↓
SUPABASE
```

Supabase conserve :

* ID vidéo
* chemin R2
* URL/référence
* taille
* durée
* format
* date de création
* statut
* métadonnées

Exemple :

```text
CONTENT-20260901-001

R2:
videos/2026/09/01/CONTENT-001/final.mp4

Supabase:
status = READY_FOR_APPROVAL
```

---

# 15. FILE D'ATTENTE DE PUBLICATION

Une vidéo peut avoir plusieurs statuts :

```text
DRAFT
↓
PRODUCING
↓
QC
↓
READY_FOR_APPROVAL
↓
APPROVED
↓
SCHEDULED
↓
PUBLISHED
↓
ANALYZING
↓
LEARNED
```

En cas de problème :

```text
BLOCKED
```

avec une raison obligatoire.

---

# 16. PUBLICATION IMMÉDIATE OU PROGRAMMÉE

Après validation humaine, le système doit permettre :

### Publication immédiate

```text
APPROVED
↓
PUBLISH NOW
↓
TikTok / Facebook
```

### Publication programmée

```text
APPROVED
↓
SCHEDULED
↓
date + heure
↓
PUBLISHING ENGINE
↓
TikTok / Facebook
```

L'utilisateur doit pouvoir constituer une **réserve de vidéos prêtes à publier**.

Exemple :

```text
10 vidéos produites
↓
10 vidéos stockées sur R2
↓
3 publiées aujourd'hui
7 programmées
```

---

# 17. CONTRÔLE QUALITÉ

Avant publication :

* format vertical
* durée 30–60 sec
* voix claire
* audio propre
* sous-titres synchronisés
* texte lisible
* captures lisibles
* rythme cohérent
* CTA présent
* aucun asset incorrect
* aucune scène inutile
* aucune erreur évidente

Pipeline :

```text
RENDER
↓
QC
↓
FAIL → CORRECTION
↓
QC
↓
PASS
```

---

# 18. VALIDATION HUMAINE

L'utilisateur ne doit pas valider chaque petite étape.

Il intervient principalement au niveau du **résultat final**.

Exemple :

```text
Machine :
"Vidéo #034 terminée.
Score qualité : 91/100.
Angle : perte répétée.
Template : Problem-Solution.
Style : rapide.
Prête à publier.

Publier maintenant ?
[OUI] [NON]
```

Le système ne doit pas envoyer :

```text
"Script terminé"
"Voix terminée"
"Montage terminé"
"B-roll terminé"
...
```

Ce serait inutile.

---

# 19. AUTONOMIE PROGRESSIVE

## Phase A

Validation humaine avant publication.

## Phase B

Le système propose automatiquement les meilleurs contenus.

## Phase C

L'utilisateur autorise certaines règles de publication automatique.

Le système doit toujours respecter les limites définies par l'utilisateur.

---

# 20. ANALYTICS ENGINE

Le système récupère les performances lorsque les APIs le permettent.

Métriques principales :

```text
VUES
WATCHTIME
RÉTENTION
LIKES
COMMENTAIRES
PARTAGES
```

Priorité :

```text
ENGAGEMENT
↓
RÉTENTION
↓
VUES
```

Plus tard :

```text
CLICS
↓
INSCRIPTIONS
↓
UTILISATION GOAL-IA
↓
ABONNEMENT
↓
REVENUS
```

---

# 21. LEARNING ENGINE

Le moteur analyse :

### Marketing

* angles
* hooks
* sujets
* CTA
* structures

### Visuel

* templates
* rythme
* scènes
* B-roll
* captures Goal-IA
* texte
* transitions
* zooms
* sous-titres
* musique

### Performance

* engagement
* rétention
* watchtime
* vues

Il construit progressivement une mémoire des contenus.

---

# 22. EXPLORATION / EXPLOITATION

Le moteur doit équilibrer :

### Exploitation

Reproduire ce qui fonctionne.

### Exploration

Tester de nouvelles hypothèses.

Configuration initiale possible :

```text
10 vidéos/jour

7 → formats/styles performants
2 → variantes
1 → expérimentation
```

Cette répartition doit évoluer selon les données.

---

# 23. RÈGLE STATISTIQUE

Le système ne doit pas déclarer :

> « Ce format fonctionne. »

après 1 ou 2 vidéos.

Il doit tenir compte :

* taille d'échantillon
* comparaison
* plateforme
* contexte
* niveau de confiance

Les conclusions doivent être graduelles :

```text
DONNÉES INSUFFISANTES
↓
SIGNAL
↓
TENDANCE
↓
PATTERN CONFIRMÉ
```

---

# 24. WHATSAPP — INTERFACE DE CONTRÔLE

L'utilisateur peut communiquer naturellement.

Exemples :

```text
"Qu'est-ce qui a marché aujourd'hui ?"

"Pourquoi cette vidéo a mal marché ?"

"Teste cette idée."

"Fais-moi une vidéo sur ça."

"Fais trois variantes."

"Publie celle-ci."

"Programme celle-ci demain à 18h."

"Arrête les publications demain."

"Quelle stratégie tu proposes pour cette semaine ?"
```

---

# 25. DEMANDES PERSONNALISÉES

L'utilisateur peut envoyer directement :

* une idée
* un script
* un hook
* une vidéo de référence
* une instruction

Exemple :

```text
Utilisateur :
"Teste cette idée."

↓
Analyse
↓
Retour stratégique
↓
Validation éventuelle
↓
Production
```

---

# 26. RAPPORT QUOTIDIEN

Tous les jours à **21h**.

Format court :

```text
📊 RAPPORT GOAL-IA

Production :
✅ X produites
✅ X publiées
⏳ X en attente
⚠️ X bloquées

Performance :
👁️ Vues
❤️ Likes
💬 Commentaires
⏱️ Watchtime
📈 Rétention

🏆 Meilleur contenu
...

🔻 Pire contenu
...

🧠 Ce que la machine apprend
...

⚠️ Problèmes
...

➡️ Priorité demain
...
```

---

# 27. RAPPORT STRATÉGIQUE HEBDOMADAIRE

Tous les 7 jours.

Le système analyse :

* meilleurs angles
* meilleurs hooks
* meilleurs templates
* meilleurs styles visuels
* meilleurs CTA
* meilleures durées
* meilleures structures
* contenus faibles
* tendances
* hypothèses
* niveau de confiance

Puis propose :

**une trajectoire pour les 7 jours suivants.**

L'utilisateur peut :

* valider
* questionner
* modifier
* refuser

---

# 28. MÉMOIRE DU SYSTÈME

Supabase constitue la mémoire structurée.

Exemple :

```text
VIDEO
↓
SCRIPT
↓
ANGLE
↓
HOOK
↓
TEMPLATE
↓
STYLE VISUEL
↓
PERFORMANCE
↓
APPRENTISSAGE
```

Ainsi, le moteur peut répondre :

> « Pourquoi recommandes-tu ce format ? »

et retrouver les données ayant conduit à cette recommandation.

---

# 29. STRUCTURE DES DONNÉES

Tables principales possibles :

```text
ideas
angles
hooks
scripts
content
templates
visual_styles
assets
voiceovers
renders
publications
metrics
experiments
learnings
reports
logs
```

Relation simplifiée :

```text
IDEA
 ↓
SCRIPT
 ↓
CONTENT
 ↓
RENDER
 ↓
PUBLICATION
 ↓
METRICS
 ↓
LEARNING
```

---

# 30. R2 + SUPABASE

Architecture définitive :

```text
                 ┌──────────────────┐
                 │    SUPABASE      │
                 │                  │
                 │ Scripts          │
                 │ Prompts          │
                 │ Angles           │
                 │ Templates        │
                 │ Metrics          │
                 │ Watchtime        │
                 │ Performance      │
                 │ Learning         │
                 └────────┬─────────┘
                          │
                          │ metadata
                          │
                          ↓
                 ┌──────────────────┐
                 │  CLOUDFLARE R2   │
                 │                  │
                 │ Videos           │
                 │ Audio            │
                 │ Exports          │
                 │ Previews         │
                 │ Assets lourds    │
                 └──────────────────┘
```

**Supabase = cerveau/mémoire.**

**R2 = coffre-fort des fichiers.**

---

# 31. INTÉGRATION FUTURE AVEC GOAL-IA

V1 :

Aucune connexion directe aux données internes de Goal-IA.

Le système travaille avec les assets et informations fournis.

V2 :

Connexion directe permettant de mesurer :

```text
CONTENU
↓
VUE
↓
CLIC
↓
INSCRIPTION
↓
UTILISATION
↓
ABONNEMENT
↓
REVENU
```

Cette intégration sera construite uniquement après validation du prototype.

---

# 32. UI

Une interface complexe n'est pas nécessaire en V1.

Priorité :

**moteur fonctionnel > dashboard esthétique**

UI minimale possible pour :

* statut
* contenus
* logs
* erreurs
* publications
* performances

WhatsApp reste l'interface principale.

---

# 33. SÉCURITÉ

Les secrets sont uniquement dans :

```text
.env.local
```

et les variables d'environnement Vercel.

Jamais dans :

* GitHub
* frontend
* logs
* PRD
* fichiers publics

---

# 34. COÛTS

Priorité absolue :

**gratuit ou presque.**

Services initiaux :

* Vercel → free tier
* Supabase → free tier
* Cloudflare R2 → coût minimal selon utilisation
* DeepSeek → paiement à l'usage
* ElevenLabs → utiliser les crédits disponibles lorsque possible

Aucune dépense automatique.

Toute nouvelle API payante doit être :

1. identifiée
2. expliquée
3. estimée
4. validée

---

# 35. GESTION DES ERREURS

Chaque module doit gérer :

* timeout
* retry
* fallback si pertinent
* logs
* statut
* notification WhatsApp

Une erreur d'un module ne doit pas détruire toute la chaîne.

---

# 36. JOURNAL D'ACTIVITÉ

Logger :

* idées
* décisions
* appels API
* contenus
* rendus
* publications
* erreurs
* performances
* apprentissages
* blocages

---

# 37. PRIORITÉS DE DÉVELOPPEMENT

## PHASE 0 — Architecture

* [ ] Next.js
* [ ] TypeScript
* [ ] Supabase
* [ ] Cloudflare R2
* [ ] structure des modules
* [ ] providers
* [ ] `.env.example`
* [ ] logging
* [ ] README
* [ ] PRD.md
* [ ] PROJECT_STATUS.md

## PHASE 1 — CERVEAU

* [ ] DeepSeek
* [ ] Strategy Engine
* [ ] Angle Engine
* [ ] Hook Engine
* [ ] Script Engine
* [ ] variantes

## PHASE 2 — ASSETS

* [ ] Asset Library
* [ ] catégorisation
* [ ] recherche
* [ ] détection assets manquants
* [ ] notification WhatsApp

## PHASE 3 — VOIX

* [ ] ElevenLabs
* [ ] Voice Engine
* [ ] génération
* [ ] stockage R2

## PHASE 4 — VISUAL + TEMPLATES

* [ ] Visual Engine
* [ ] Template Engine
* [ ] styles visuels
* [ ] paramètres de montage
* [ ] mapping scènes/assets

## PHASE 5 — VIDEO

* [ ] FFmpeg
* [ ] Video Engine
* [ ] sous-titres
* [ ] musique
* [ ] voix
* [ ] B-roll
* [ ] captures Goal-IA
* [ ] export MP4

## PHASE 6 — STORAGE

* [ ] upload R2
* [ ] metadata Supabase
* [ ] versioning
* [ ] previews
* [ ] file status

## PHASE 7 — QC

* [ ] contrôle automatique
* [ ] score qualité
* [ ] correction
* [ ] validation

## PHASE 8 — WHATSAPP

* [ ] webhook
* [ ] commandes
* [ ] rapports
* [ ] validation
* [ ] demandes personnalisées

## PHASE 9 — PUBLICATION

* [ ] TikTok
* [ ] Facebook
* [ ] programmation
* [ ] publication immédiate
* [ ] intermédiaire si nécessaire

## PHASE 10 — ANALYTICS

* [ ] récupération métriques
* [ ] stockage
* [ ] comparaison
* [ ] performance par contenu

## PHASE 11 — LEARNING

* [ ] apprentissage marketing
* [ ] apprentissage visuel
* [ ] exploration/exploitation
* [ ] confiance
* [ ] recommandations

---

# 38. RÈGLE DE DÉVELOPPEMENT POUR CLINE

Avant chaque fonctionnalité :

1. lire `PRD.md`
2. lire `PROJECT_STATUS.md`
3. inspecter le code existant
4. identifier les dépendances
5. vérifier les limites techniques
6. construire uniquement l'étape actuelle
7. tester
8. corriger
9. documenter
10. mettre à jour `PROJECT_STATUS.md`

Ne pas construire plusieurs phases simultanément sans nécessité.

---

# 39. RÈGLE DE CHOIX TECHNOLOGIQUE

Lorsqu'une technologie n'est pas définie :

```text
PROBLÈME
↓
OPTIONS
↓
COÛT
↓
COMPLEXITÉ
↓
LIMITES
↓
FIABILITÉ
↓
RECOMMANDATION
```

Priorité :

1. solution officielle
2. gratuite
3. open source
4. simple
5. fiable
6. remplaçable

Ne pas ajouter de technologie uniquement parce qu'elle est populaire.

---

# 40. RÈGLE DE NON-SURCONSTRUCTION

Ne pas construire prématurément :

* application mobile
* système multi-utilisateur
* facturation
* dashboard complexe
* microservices
* SaaS commercial
* fonctionnalités inutiles

Le produit est d'abord :

**une machine personnelle d'acquisition pour Goal-IA.**

---

# 41. RÈGLE UNE VIDÉO AVANT DIX

Avant d'automatiser 10 vidéos/jour :

```text
1 vidéo
↓
qualité validée
↓
pipeline stable
↓
3 vidéos
↓
pipeline stable
↓
10 vidéos/jour
```

La qualité doit rester stable lorsque le volume augmente.

---

# 42. CRITÈRE MVP

Le MVP est fonctionnel lorsqu'il peut faire :

```text
UNE IDÉE
↓
ANGLE
↓
HOOK
↓
SCRIPT
↓
VOIX
↓
ASSETS
↓
STYLE VISUEL
↓
TEMPLATE
↓
MONTAGE
↓
QC
↓
EXPORT
↓
R2
↓
WHATSAPP
↓
VALIDATION
↓
PUBLICATION
```

Puis :

```text
PUBLICATION
↓
RÉSULTATS
↓
SUPABASE
↓
ANALYSE
↓
APPRENTISSAGE
↓
PROCHAIN CONTENU
```

---

# 43. VISION FINALE

```text
                 DONNÉES
                    ↓
                STRATÉGIE
                    ↓
               PRODUCTION
                    ↓
                 RENDU
                    ↓
               STOCKAGE R2
                    ↓
               VALIDATION
                    ↓
              PUBLICATION
                    ↓
               PERFORMANCE
                    ↓
          ┌─────────┴─────────┐
          ↓                   ↓
   APPRENTISSAGE         RAPPORTS
          ↓
     NOUVELLE STRATÉGIE
          ↓
       PRODUCTION
```

La machine doit progressivement apprendre **quoi dire**, **comment le dire** et **comment le montrer visuellement**.

---

# 44. OBJECTIF FINAL

L'objectif final est de réduire progressivement le travail manuel à :

```text
IDÉES
↓
VALIDATION DES GRANDES DÉCISIONS
↓
SURVEILLANCE
↓
AFFILIÉS
```

La machine prend en charge progressivement :

```text
RECHERCHE
SCRIPT
VOIX
ASSETS
MONTAGE
EXPORT
STOCKAGE
PROGRAMMATION
PUBLICATION
ANALYSE
APPRENTISSAGE
RAPPORTS
```

**Principe absolu :**

> Automatiser le travail répétitif, mais conserver à l'humain le contrôle stratégique.

FIN DU PRD.
