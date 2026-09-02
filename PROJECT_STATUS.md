# PROJECT_STATUS — GOAL-IA CONTENT ENGINE

> Document de reprise de session. Règle de développement (PRD §38) : avant chaque
> fonctionnalité, lire `PRD.md`, lire ce fichier, inspecter le code existant,
> identifier les dépendances, vérifier les limites techniques, puis construire
> uniquement l'étape actuelle.

**PRD :** v2.0 — 01/09/2026
**Dernière mise à jour :** 02/09/2026
**Phase courante :** PHASE 5 — Video
**Statut de la phase :** ✅ TERMINÉE et vérifiée (première vidéo MP4 réelle montée : 35 s, 1080×1920)
**Prochaine phase :** PHASE 6 — Storage (upload R2 + métadonnées Supabase, versioning, previews)

---

## ✅ Checklist PHASE 0 — Architecture (PRD §37)

- [x] **Next.js** — v16.3.4, App Router, répertoire `src/`, Turbopack, sans Tailwind
- [x] **TypeScript** — v5, `strict`, alias `@/*` → `./src/*`
- [x] **Supabase** — `@supabase/supabase-js` v2 installé + provider isolé
- [x] **Cloudflare R2** — `@aws-sdk/client-s3` v3 installé + provider isolé
- [x] **structure des modules** — `/src/engines` (14 moteurs), `/src/providers` (7), `/src/lib` (5)
- [x] **providers** — isolés : supabase, cloudflare-r2 (fonctionnels) ; deepseek, elevenlabs,
      whatsapp, tiktok, facebook (squelettes, implémentés à leur phase)
- [x] **`.env.example`** — versionné, liste toutes les variables par phase (PRD §33)
- [x] **logging** — `src/lib/logger` fonctionnel (niveaux, JSON, sans dépendance, remplaçable)
- [x] **README** — projet, stack, démarrage, structure, sécurité
- [x] **PRD.md** — fourni par l'utilisateur (v2.0, 01/09/2026)
- [x] **PROJECT_STATUS.md** — ce fichier

### Vérifications effectuées (session du 02/09/2026)

| Vérification | Commande | Résultat |
|---|---|---|
| Typage | `npm run typecheck` | ✅ OK |
| Lint | `npm run lint` | ✅ OK (exit 0, aucun diagnostic) |
| Build | `npm run build` | ✅ OK (compilé 66 s, 2 routes statiques : `/`, `/_not-found`) |
| Runtime | `next start` + HTTP GET `/` | ✅ HTTP 200, HTML rendu « Goal-IA Content Engine — Phase 0 » |
| Connexion DeepSeek | GET `api.deepseek.com/models` (clé `.env.local`) | ✅ HTTP 200 — `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-v4-flash-vision-exp` |
| Connexion Supabase | GET `<SUPABASE_URL>/auth/v1/health` (apikey anon) | ✅ HTTP 200 — GoTrue v2.196.0 (service sain) |

---

## ✅ Checklist PHASE 1 — Cerveau (PRD §37)

- [x] **Provider DeepSeek** — `src/providers/deepseek` : client HTTP isolé, timeout 90 s,
      retries (429/5xx/réseau) avec backoff, logs tokenisés, erreurs typées `DeepSeekError`
- [x] **Strategy Engine** — `analyze()` : idées/données → directions de contenu priorisées
- [x] **Angle Engine** — `generateAngles()` : 2-6 angles marketing distincts par sujet
- [x] **Hook Engine** — `generateHooks()` : 3-8 hooks parlés typés (question, peur, contre-intuitif…)
- [x] **Script Engine** — `generateScript()` : templates PRD §12 (problem-solution, erreur-consequence,
      demonstration, comparaison), budget de mots déterministe 30-60 s (150 mots/min), CTA, scènes
- [x] **variantes** — `generateVariants()` : focus hook / cta / ton
- [x] **Helpers IA** — `src/lib/ai` : `chatText`, `chatJson` (parse + correction JSON auto), `ChatProvider`
      (interface remplaçable), `src/lib/brand` : contexte Goal-IA centralisé
- [x] **Outil de test** — `scripts/demo-brain.ts` + `npm run demo:brain` (tsx, devDependency)

### Vérifications effectuées (démo DeepSeek réelle — 02/09/2026)

`npm run demo:brain` → chaîne complète exécutée en conditions réelles :

```text
1) STRATÉGIE : 2 directions (ex. « Les parieurs composent des coupons trop chargés » — priorité high)
2) ANGLES   : 3 angles (peur, contraste, preuve)
3) HOOKS    : 4 hooks typés
4) SCRIPT   : template problem-solution — HOOK → PROBLEME → DEMO → SOLUTION → CTA,
             45 s cible, ~75 mots estimés, CTA présent
5) VARIANTES: 2 variantes focus « hook » générées
✅ Démo Phase 1 terminée — le cerveau fonctionne.
```

| Vérification | Commande | Résultat |
|---|---|---|
| Typage | `npm run typecheck` | ✅ OK |
| Lint | `npm run lint` | ✅ OK (0 erreur, 0 warning) |
| Build | `npm run build` | ✅ OK |
| Démo réelle | `npm run demo:brain` | ✅ 6 appels DeepSeek réussis (modèle `deepseek-v4-flash`, raisonnement désactivé) |

---

## ✅ Checklist PHASE 2 — Assets (PRD §37)

- [x] **Asset Library** — `src/engines/asset-engine` : scan local `assets/` (PRD §8) → index déterministe
- [x] **catégorisation** — 7 catégories PRD §8, extensions validées par catégorie, mots-clés extraits des noms
- [x] **recherche** — `search()` : mots-clés + synonymes de catégorie, score & tri (PRD §3.6, aucune IA)
- [x] **détection d'assets manquants** — `detectMissing()` : demandes (ex. visualHint) → candidats ou ⚠️ ASSET MANQUANT
- [x] **notification WhatsApp** — différée en Phase 8 (décision utilisateur) : manque journalisé (warn) + statut BLOCKED
- [x] **Assets réels fournis par l'utilisateur** — 58 fichiers (~615 Mo) dans `assets/` (privé, ignoré par git)
- [x] **Outil de test** — `scripts/demo-assets.ts` + `npm run demo:assets`

### Vérifications effectuées (02/09/2026)

| Vérification | Résultat |
|---|---|
| `npm run demo:assets` — scan | ✅ 58 assets (goal-ia 6, screenshots 3, app-videos 8, broll 19, music 7, logos 1, templates 14) |
| Recherche « roulette » | ✅ `app-videos/roulette.mp4` + `templates/roulette.mp4` |
| Recherche « captures d'écran » | ✅ 3 résultats dans `screenshots/` |
| Recherche « b-roll illustration » | ✅ catégorie `broll` (limite : noms Pixabay non descriptifs → sélection catégorielle, contenu à vérifier) |
| Détection de manque | ✅ « logo ×2, 1 disponible » → ⚠️ ASSET MANQUANT journalisé (statut BLOCKED, PRD §9) |
| `npm run typecheck` / `lint` / `build` | ✅ OK |

---

## ✅ Checklist PHASE 3 — Voix (PRD §37)

- [x] **ElevenLabs provider** — `src/providers/elevenlabs` : synthèse MP3, timeout, erreurs typées, isolé/remplaçable
- [x] **Multi-comptes** — décision utilisateur : 3 comptes gratuits ~10k crédits/mois. Formats `ELEVENLABS_API_KEY_01…`,
      `ELEVENLABS_API_KEYS` (liste) et `ELEVENLABS_API_KEY`. Rotation automatique sur quota (HTTP 401/402/429) ;
      logs sans jamais révéler les clés
- [x] **Voice Engine** — `src/engines/voice-engine` : `generateVoiceover()` texte → MP3 local `output/voice/`
      (durée estimée par mots/min ; R2 branché à la Phase 6)
- [x] **génération** — `npm run demo:voice` : voix réelle générée (458 Ko, ~32 s, voix « Roger »)
- [x] **stockage R2** — différé à la Phase 6 (décision) : clés R2 encore vides ; écriture locale en attendant

### Vérifications effectuées (02/09/2026)

| Vérification | Résultat |
|---|---|
| `npm run demo:voice` | ✅ MP3 généré `output/voice/demo-coupons-*.mp3` (458 Ko, ~32 s estimées) |
| Rotation multi-comptes | ✅ **clé #1 HTTP 401 (invalide) → bascule auto sur clé #2** réussie (3 comptes configurés) |
| Voix sélectionnée | « Roger - Laid-Back… » (première voix du compte #2) — configurable via `ELEVENLABS_VOICE_ID` |
| `npm run typecheck` / `lint` / `build` | ✅ OK |
| `output/` ignoré par git | ✅ vérifié |

---

## ✅ Checklist PHASE 4 — Visual + Templates (PRD §37)

- [x] **Template Engine** — `src/engines/template-engine` : règles visuelles PAR RÔLE (PRD §10 :
      HOOK→texte fort, PROBLÈME→B-roll, DÉMO→capture, CTA→Goal-IA+texte), 3 styles visuels
      (`impact-rapide`, `clair-didactique`, `emotionnel`), paramètres de montage
- [x] **Visual Engine** — `src/engines/visual-engine` : `buildVisualPlan()` → pour chaque scène :
      asset sélectionné (Asset Engine P2), mode visuel, transition, zoom, emphase de texte
- [x] **styles visuels + paramètres de montage** — sous-titres (word-pop/bottom/minimal),
      énergie musicale, intensité des zooms
- [x] **caractéristiques PRD §11** — `VisualCharacteristics` : brollRatio, goalIaRatio,
      textOverlayRatio, transitionFrequency, zoomFrequency, ctaPositionSec, etc. (pour apprentissage futur)
- [x] **mapping scènes → assets** — via les `visualHint` et l'Asset Engine ; repli catégoriel
      documenté (contenu B-roll non vérifié) ; aucun asset inventé (PRD §9)
- [x] **Outil de test** — `scripts/demo-visual.ts` + `npm run demo:visual`

### Vérifications effectuées (02/09/2026)

| Vérification | Résultat |
|---|---|
| `npm run demo:visual` | ✅ plan visuel construit : 5 scènes → 3 assets réels utilisés, 0 manquant |
| Caractéristiques PRD §11 | ✅ brollRatio 0.34, goalIaRatio 0.66, ctaPosition 30 s, zoomFrequency 0.6 (style impact-rapide) |
| `npm run typecheck` / `lint` / `build` | ✅ OK |

---

## ✅ Checklist PHASE 5 — Video (PRD §37)

- [x] **FFmpeg** — installé (winget Gyan.FFmpeg 9.0.1) ; chemins `FFMPEG_PATH`/`FFPROBE_PATH`
      ajoutés à `.env.local` (optionnels dans `.env.example`)
- [x] **Video Engine** — `src/engines/video-engine` : montage vertical réel (PRD §3.8/§13) :
      segments par scène (assets vidéo/image recadrés 1080×1920), texte à l'écran en bas
      (drawtext + police système), concaténation, mixage audio (voix off + musique bas volume),
      export MP4 H.264
- [x] **sous-titres / texte à l'écran** — texte fort par scène (depuis le script/plan visuel)
- [x] **musique** — asset `music/` mixé en fond (volume 0.12, fondu de fin)
- [x] **voix + B-roll + captures** — voix off Phase 3 + assets réels P2 intégrés
- [x] **export MP4 + mesure** — durée réelle lue via ffprobe
- [x] **Outil de test** — `scripts/demo-video.ts` + `npm run demo:video`

### Vérifications effectuées (02/09/2026)

| Vérification | Résultat |
|---|---|
| `npm run demo:video` | ✅ **MP4 5,1 Mo, 35 s** (durée réelle mesurée 35,0 s par ffprobe), 5 segments encodés |
| Composition | 2 B-roll + 1 capture + 1 app-video + 1 Goal-IA + voix off + musique |
| `npm run typecheck` / `lint` / `build` | ✅ OK |
| `output/video/` ignoré par git | ✅ (via `/output/`) |

---

## 🧭 État du code

```text
root/
  PRD.md                 → feuille de route (source de vérité)
  PROJECT_STATUS.md      → ce fichier
  README.md              → guide du projet
  .env.example           → variables requises (jamais de secrets réels)
  package.json           → scripts : dev, build, start, lint, typecheck, demo:brain/assets/voice/visual/video
  scripts/demo-brain.ts  → démo Phase 1 (chaîne stratégie → script, DeepSeek réel)
  scripts/demo-assets.ts → démo Phase 2 (scan + recherche + détection de manques, assets réels)
  scripts/demo-voice.ts  → démo Phase 3 (voix off réelle, rotation multi-comptes ElevenLabs)
  scripts/demo-visual.ts → démo Phase 4 (plan visuel : script + assets réels → plan de montage)
  scripts/demo-video.ts  → démo Phase 5 (montage MP4 réel : scènes + voix + musique)
  src/
    app/                 → layout + page minimale (Phase 0)
    engines/             → strategy/angle/hook/script (P1) + asset (P2) + voice (P3) +
                           template/visual (P4) + video (P5) implémentés ; 5 moteurs en squelettes
    providers/           → deepseek (P1) + elevenlabs multi-comptes (P3) implémentés ;
                           supabase + cloudflare-r2 fonctionnels (P0) ; whatsapp/tiktok/facebook squelettes
    lib/                 → logger + ai (chatText/chatJson) + brand fonctionnels ;
                           database/storage/scheduler/metrics squelettes
```

Rappel des phases restantes (PRD §37) : 6 Storage → 7 QC → 8 WhatsApp → 9 Publication →
10 Analytics → 11 Learning.

---

## 📋 Décisions prises

| Décision | Raison |
|---|---|
| `create-next-app` template **empty** (pas de démo) | démarrage propre ; non-surconstruction (PRD §40) |
| Next.js 16.3.4 (dernière stable au 02/09/2026) | solution officielle (PRD §39) ; App Router requis |
| `@aws-sdk/client-s3` pour Cloudflare R2 | R2 compatible S3 ; SDK officiel recommandé par Cloudflare |
| Pas de Tailwind | UI minimale en V1 (PRD §32) ; CSS inline suffisant |
| Logger sans dépendance (JSON sur `console.*`) | simple, fiable, remplaçable (PRD §39) ; Vercel exploite les logs console |
| Racine = dossier du projet (PRD + app ensemble) | PRD et code versionnés ensemble ; git local initialisé |
| Identité git locale `goal-content-machine-dev` | aucune identité globale configurée ; à ajuster via `git config` si besoin |
| Dépôt GitHub `tridonlubunad18-glitch/engine_content` | remote `origin`, branche `main` poussée (PRD §3.11) |
| Modèle DeepSeek par défaut `deepseek-v4-flash` | rapide et économique ; choix vérifié via GET `/models` (02/09/2026) |
| `thinking: { type: "disabled" }` par défaut au provider | le mode raisonnement de v4-flash brûlait tout le budget tokens sans produire de contenu (8 192 tokens consommés) ; désactivé → réponses 5-10 s ; repli auto sans paramètre si HTTP 400 |
| Budget de mots calculé en code (150 mots/min) | PRD §3.6 : logique déterministe en code, jamais en IA |
| Templates PRD §12 codés en dur (`TEMPLATE_ROLES`) | ordre des scènes déterministe ; l'IA remplit les narrations |
| `tsx` en devDependencies + `scripts/demo-brain.ts` | test réel des engines TS hors Next (npm run demo:brain) |
| Assets réels en local `assets/` (ignoré par git) | PRD §8 : l'utilisateur fournit les assets ; jamais commités ; migration cloud (R2/Supabase Storage) à la Phase 6 |
| Asset Engine 100 % déterministe (scan, mots-clés, catégories) | PRD §3.6 : jamais d'IA pour recherche/tri ; limite documentée : B-roll Pixabay non descriptif → sélection catégorielle |
| Notification d'asset manquant différée à la Phase 8 | décision utilisateur (option A1) : manque journalisé + statut BLOCKED en attendant WhatsApp |
| ElevenLabs multi-comptes (3 formats de clés, rotation auto) | plusieurs comptes gratuits ~10k crédits/mois ; bascule sur 401/402/429 — validée en réel (clé #1 401 → clé #2 OK) |
| Voix off stockées en local `output/voice/` | clés R2 encore vides (décision) : écriture locale, branchement R2 à la Phase 6 |
| Mémoire du compte préféré dans le provider ElevenLabs | après succès d'un compte, il est réessayé en premier (appels suivants rapides, logs propres) |
| `.env.local` réordonné après sondage réel | anciens #1/#2 : synthèse refusée (quota côté API malgré l'écran) ; le compte fonctionnel (80k) est passé en `ELEVENLABS_API_KEY_01` |
| Template/Visual Engines 100 % déterministes (règles par rôle, styles) | PRD §3.6/§10/§12 : aucune IA pour le plan de montage ; caractéristiques PRD §11 calculées en code |
| Repli catégoriel B-roll marqué « contenu non vérifié » | limite connue Phase 2 (noms Pixabay) : jamais présenté comme une certitude |
| FFmpeg 9.0.1 via winget + `FFMPEG_PATH`/`FFPROBE_PATH` | montage local réel (Phase 5) ; chemins dans `.env.local`, optionnels dans `.env.example` |
| Video Engine v1 (segments + concat + mixage) | PRD §13 ; rendu local (Vercel/worker envisagés plus tard, PRD §3.8) |

---

## ⚠️ Notes d'environnement (Windows)

- PowerShell bloque l'exécution des `.ps1` (ExecutionPolicy) → utiliser **`npm.cmd`**, **`npx.cmd`**.
- npm est lent (réseau) : les installs peuvent dépasser 30 s → lancer en arrière-plan via
  `Start-Process cmd.exe /c "… > log 2>&1 & echo EXITCODE=%ERRORLEVEL% > exit"` puis sonder.
  Ne pas utiliser `Start-Process -RedirectStandardOutput` (bloque l'appel).
- Le postinstall `unrs-resolver` n'a pas été approuvé par npm (`allow-scripts`) —
  constaté **sans impact** sur lint/build/typecheck.
- Première exécution d'ESLint (type-aware) lente (~1-2 min) ; les suivantes sont rapides.
- `deepseek-v4-flash` raisonne par défaut et peut épuiser `max_tokens` en `reasoning_content` sans
  jamais produire de contenu → toujours garder `disableThinking` (défaut true au provider) pour les
  tâches JSON ; prévoir un budget de 4 096 tokens par appel.
- Les appels DeepSeek complexes (script, variantes) dépassent 30 s → lancer via
  `Start-Process cmd.exe /c "… > log 2>&1"` puis sonder le log.
- `%ERRORLEVEL%` est évalué à la *lecture* de la ligne cmd (`& echo EXITCODE=%ERRORLEVEL%`) → résultat
  non fiable ; préférer laisser le log comme source de vérité (présence de « ✅ … terminée »).

---

## 🚦 PROCHAINE SESSION — PHASE 6 : Storage

Définition (PRD §37) :
- [ ] upload R2 (voix off, vidéos, exports → Cloudflare R2)
- [ ] métadonnées Supabase (liens fichiers, tailles, statuts — PRD §14/§29/§30)
- [ ] versioning
- [ ] previews
- [ ] file status

**Prérequis identifiés :**
1. **Clés Cloudflare R2 encore vides** dans `.env.local` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) → à fournir par l'utilisateur + création du bucket.
2. Schéma Supabase : table(s) contenus/fichiers à créer (PRD §29) — les clés Supabase existent déjà.
3. R2 est l'entrepôt distant (le cloud n'a pas accès à `output/` local) — c'est la bascule « la
   machine travaille sans le PC » amorcée par l'utilisateur.

---

## 🗂️ Historique des sessions

### Session 02/09/2026 — Phases 0 → 2
- **Phase 0 — Architecture** : scaffold Next.js 16 + TS, structure engines/providers/lib,
  connecteurs Supabase/R2, logger, `.env.example`, README, PROJECT_STATUS. Vérifiée (typecheck,
  lint, build, runtime HTTP 200). Commit `6af5744`.
- **Connexions** : clés DeepSeek + Supabase renseignées par l'utilisateur dans `.env.local`
  (sécurisées — `.env.example` restauré vide). Connectivité vérifiée (HTTP 200). Commit `f06e794`.
- **GitHub** : remote `origin` configuré sur `tridonlubunad18-glitch/engine_content`, branche `main`
  poussée.
- **Phase 1 — Cerveau** : provider DeepSeek (timeout/retry/JSON/logs), Strategy/Angle/Hook/Script
  Engines + variantes, helpers `lib/ai`, contexte marque `lib/brand`, démo `npm run demo:brain`.
  Vérifiée par démo DeepSeek réelle bout-en-bout. Commit `7665cb0`.
- **Socle assets (prep)** : dossier `assets/` créé (7 catégories PRD §8, README locaux), `/assets/`
  ajouté au `.gitignore`. Commit `054076b`.
- **Phase 2 — Assets** : Asset Engine 100 % déterministe — scan (58 assets réels), recherche
  (mots-clés + catégories), détection d'assets manquants journalisée + statut BLOCKED (WhatsApp
  différée à la Phase 8, décision utilisateur). Démo `npm run demo:assets` vérifiée.
- **Phase 3 — Voix** : provider ElevenLabs multi-comptes (3 clés de 3 comptes, rotation auto sur
  quota — validée en réel : clé #1 401 → clé #2 OK), Voice Engine → MP3 local `output/voice/`
  (R2 en Phase 6). Démo `npm run demo:voice` vérifiée (458 Ko, ~32 s). Commit `9e8966f`.
- **Résolution ElevenLabs** : permissions clé #1 corrigées (dashboard), quotas réels sondés via
  synthèse ; `.env.local` réordonné (compte fonctionnel en #01) + mémoire du compte préféré dans
  le provider. Commit `4ad310f`.
- **Phase 4 — Visual + Templates** : Template Engine (règles par rôle PRD §10, 3 styles visuels) +
  Visual Engine (plan de montage scène par scène, caractéristiques PRD §11). Démo
  `npm run demo:visual` vérifiée sur les 58 assets. Commit `f8ab44b`.
- **Phase 5 — Video** : FFmpeg 9.0.1 installé (winget), Video Engine réel (segments 1080×1920,
  texte à l'écran, concaténation, voix + musique, export MP4). Démo `npm run demo:video` vérifiée
  (MP4 5,1 Mo, 35 s mesurées). Commit : à noter après push.
