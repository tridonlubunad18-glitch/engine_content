# PROJECT_STATUS — GOAL-IA CONTENT ENGINE

> Document de reprise de session. Règle de développement (PRD §38) : avant chaque
> fonctionnalité, lire `PRD.md`, lire ce fichier, inspecter le code existant,
> identifier les dépendances, vérifier les limites techniques, puis construire
> uniquement l'étape actuelle.

**PRD :** v2.0 — 01/09/2026
**Dernière mise à jour :** 02/09/2026
**Phase courante :** PHASE 2 — Assets
**Statut de la phase :** ✅ TERMINÉE et vérifiée (démo réelle sur 58 assets)
**Prochaine phase :** PHASE 3 — Voix (ElevenLabs + Voice Engine + stockage R2)

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

## 🧭 État du code

```text
root/
  PRD.md                 → feuille de route (source de vérité)
  PROJECT_STATUS.md      → ce fichier
  README.md              → guide du projet
  .env.example           → variables requises (jamais de secrets réels)
  package.json           → scripts : dev, build, start, lint, typecheck, demo:brain, demo:assets
  scripts/demo-brain.ts  → démo Phase 1 (chaîne stratégie → script, DeepSeek réel)
  scripts/demo-assets.ts → démo Phase 2 (scan + recherche + détection de manques, assets réels)
  src/
    app/                 → layout + page minimale (Phase 0)
    engines/             → strategy/angle/hook/script (Phase 1) + asset (Phase 2) implémentés ;
                           9 autres moteurs en squelettes annotés
    providers/           → deepseek implémenté (Phase 1) ; supabase + cloudflare-r2
                           fonctionnels (Phase 0) ; elevenlabs/whatsapp/tiktok/facebook squelettes
    lib/                 → logger + ai (chatText/chatJson) + brand fonctionnels ;
                           database/storage/scheduler/metrics squelettes
```

Rappel des phases restantes (PRD §37) : 3 Voix → 4 Visual+Templates → 5 Video → 6 Storage →
7 QC → 8 WhatsApp → 9 Publication → 10 Analytics → 11 Learning.

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

## 🚦 PROCHAINE SESSION — PHASE 3 : Voix

Définition (PRD §37) :
- [ ] ElevenLabs (provider + clef)
- [ ] Voice Engine
- [ ] génération (texte de la Phase 1 → audio)
- [ ] stockage R2

**Requis avant de démarrer :**
1. Clef API **ElevenLabs** (`ELEVENLABS_API_KEY` — actuellement vide dans `.env.local`) + modèle/voix à utiliser.
2. Clés **Cloudflare R2** (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   — vides dans `.env.local`) : la Phase 3 prévoit le stockage R2 des voix off (PRD §37).
   Alternative si R2 pas prêt : stockage local temporaire, upload en Phase 6 — à trancher avec l'utilisateur.
3. Le Voice Engine consommera `voiceoverText` des scripts Phase 1 → chaîne de test : script → voix → fichier.

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
