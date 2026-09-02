# PROJECT_STATUS — GOAL-IA CONTENT ENGINE

> Document de reprise de session. Règle de développement (PRD §38) : avant chaque
> fonctionnalité, lire `PRD.md`, lire ce fichier, inspecter le code existant,
> identifier les dépendances, vérifier les limites techniques, puis construire
> uniquement l'étape actuelle.

**PRD :** v2.0 — 01/09/2026
**Dernière mise à jour :** 02/09/2026
**Phase courante :** PHASE 1 — Cerveau
**Statut de la phase :** ✅ TERMINÉE et vérifiée (démo DeepSeek réelle bout-en-bout)
**Prochaine phase :** PHASE 2 — Assets (Asset Library, catégorisation, recherche, détection d'assets manquants)

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

```text
root/
  PRD.md                 → feuille de route (source de vérité)
  PROJECT_STATUS.md      → ce fichier
  README.md              → guide du projet
  .env.example           → variables requises (jamais de secrets réels)
  package.json           → scripts : dev, build, start, lint, typecheck, demo:brain
  scripts/demo-brain.ts  → démo Phase 1 (chaîne stratégie → script, DeepSeek réel)
  src/
    app/                 → layout + page minimale (Phase 0)
    engines/             → strategy/angle/hook/script implémentés (Phase 1) ;
                           10 autres moteurs en squelettes annotés
    providers/           → deepseek implémenté (Phase 1) ; supabase + cloudflare-r2
                           fonctionnels (Phase 0) ; elevenlabs/whatsapp/tiktok/facebook squelettes
    lib/                 → logger + ai (chatText/chatJson) + brand fonctionnels ;
                           database/storage/scheduler/metrics squelettes
```

Rappel des phases restantes (PRD §37) : 2 Assets → 3 Voix → 4 Visual+Templates →
5 Video → 6 Storage → 7 QC → 8 WhatsApp → 9 Publication → 10 Analytics → 11 Learning.

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

## 🚦 PROCHAINE SESSION — PHASE 2 : Assets

Définition (PRD §37) :
- [ ] Asset Library (bibliothèque locale d'assets)
- [ ] catégorisation (goal-ia, screenshots, app-videos, broll, music, logos, templates — PRD §8)
- [ ] recherche
- [ ] détection d'assets manquants (PRD §9 : chercher → trouver → utiliser, sinon signaler)
- [ ] notification WhatsApp

**⚠️ Contradiction d'ordre à trancher au démarrage de la Phase 2 :**
La « notification WhatsApp » de la Phase 2 dépend du provider WhatsApp, prévu en **Phase 8**.
Options à valider avec l'utilisateur : (a) Phase 2 = bibliothèque + détection en local, statuts
`BLOCKED`/`ASSET_MISSING` en base, notification WhatsApp reportée en Phase 8 ; (b) implémenter un
envoi WhatsApp minimal anticipé.

**Requis avant la Phase 2 :**
1. Les assets réels de Goal-IA à fournir (vidéos, captures, logos, B-roll, musiques, templates —
   PRD §8) ou décision d'utiliser un jeu d'assets de test local.
2. Choix du stockage de la bibliothèque d'assets (local `assets/` vs Supabase Storage vs R2) —
   PRD §8 montre une arborescence `/assets` ; R2 n'étant prévu qu'en Phase 6, l'arbitrage est à faire.

---

## 🗂️ Historique des sessions

### Session 02/09/2026 — Phases 0 et 1
- **Phase 0 — Architecture** : scaffold Next.js 16 + TS, structure engines/providers/lib,
  connecteurs Supabase/R2, logger, `.env.example`, README, PROJECT_STATUS. Vérifiée (typecheck,
  lint, build, runtime HTTP 200). Commit `6af5744`.
- **Connexions** : clés DeepSeek + Supabase renseignées par l'utilisateur dans `.env.local`
  (sécurisées — `.env.example` restauré vide). Connectivité vérifiée (HTTP 200). Commit `f06e794`.
- **GitHub** : remote `origin` configuré sur `tridonlubunad18-glitch/engine_content`, branche `main`
  poussée.
- **Phase 1 — Cerveau** : provider DeepSeek (timeout/retry/JSON/logs), Strategy/Angle/Hook/Script
  Engines + variantes, helpers `lib/ai`, contexte marque `lib/brand`, démo `npm run demo:brain`.
  Vérifiée par démo DeepSeek réelle bout-en-bout. Commit (à créer).
