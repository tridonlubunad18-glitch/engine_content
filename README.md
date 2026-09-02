# Goal-IA Content Engine

Prototype personnel d'automatisation de contenu vidéo, publication et apprentissage pour accélérer l'acquisition de Goal-IA.

> **Feuille de route :** [`PRD.md`](./PRD.md) — v2.0. **État du projet :** [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)

## Vision

Transformer une idée ou une donnée marketing en contenu vidéo prêt à publier, puis analyser les résultats pour améliorer automatiquement les contenus suivants.

```text
IDÉE → ANGLE → HOOK → SCRIPT → VOIX → ASSETS → STYLE → TEMPLATE
     → MONTAGE → QC → EXPORT → R2 → VALIDATION → PUBLICATION
     → RÉSULTATS → ANALYSE → APPRENTISSAGE → NOUVELLE STRATÉGIE
```

## Stack (PRD §3)

| Composant | Choix | Rôle |
|---|---|---|
| Langage | TypeScript | strict, JavaScript uniquement si nécessaire |
| Framework | Next.js (App Router, `src/`) | backend, API, orchestration, interface minimale |
| Hébergement | Vercel (free tier) | déploiement, variables d'environnement, cron |
| Base de données | Supabase / PostgreSQL | mémoire structurée (métadonnées, métriques, apprentissages) |
| Stockage fichiers | Cloudflare R2 | vidéos, voix off, exports, previews (S3 API via AWS SDK v3) |
| IA | DeepSeek API | analyse marketing, scripts, stratégie, apprentissage |
| Voix off | ElevenLabs | génération vocale (provider abstrait, remplaçable) |
| Montage | FFmpeg | assemblage, sous-titres, export MP4 |
| Publication | TikTok / Facebook (API officielles) | dès la Phase 9 |
| Contrôle humain | WhatsApp Business API | rapports, validation, commandes |

> Règle absolue : **ne jamais utiliser DeepSeek quand une logique déterministe suffit** (PRD §3.6).

## Démarrage rapide

```bash
# 1. Prérequis : Node.js >= 20
npm install

# 2. Variables d'environnement
cp .env.example .env.local   # puis remplir les valeurs (PRD §33)

# 3. Développement
npm run dev                  # http://localhost:3000

# 4. Vérifications
npm run lint
npm run typecheck
npm run build

# 5. Démo du cerveau (Phase 1) — nécessite DEEPSEEK_API_KEY dans .env.local
npm run demo:brain

# 6. Démo Asset Engine (Phase 2) — scan la bibliothèque locale assets/
npm run demo:assets

# 7. Démo Voice Engine (Phase 3) — voix off ElevenLabs (nécessite ELEVENLABS_API_KEY_01…)
npm run demo:voice

# 8. Démo Visual + Templates (Phase 4) — plan visuel sur la bibliothèque locale
npm run demo:visual
```

## Structure des modules (PRD §4)

```text
src/
  app/            → App Router (pages, API routes)
  engines/        → stratégie, angle, hook, script, asset, visual,
                    template, voice, video, quality, publishing,
                    analytics, learning, report
  providers/      → deepseek, elevenlabs, whatsapp, tiktok, facebook,
                    supabase, cloudflare-r2  (toujours isolés)
  lib/            → database, storage, scheduler, logger, metrics
```

Chaque moteur/provider est construit **uniquement lors de sa phase** (voir les phases dans PRD §37 et l'état d'avancement dans `PROJECT_STATUS.md`).

## Assets locaux (PRD §8)

Bibliothèque privée des matières premières — **jamais poussée sur GitHub** (dossier `/assets/` ignoré par git).

| Dossier | Contenu |
|---|---|
| `assets/goal-ia/` | Vidéos de présentation / démo du produit Goal-IA (mp4) |
| `assets/screenshots/` | Captures d'écran de l'application (png, jpg, webp) |
| `assets/app-videos/` | Enregistrements vidéo de l'application en action (mp4) |
| `assets/broll/` | Plans d'illustration libres de droits (parieur, téléphone, sport…) |
| `assets/music/` | Musiques libres de droits (mp3, wav) |
| `assets/logos/` | Logos Goal-IA (png, svg) |
| `assets/templates/` | Templates de montage / overlays réutilisables |

> ⚠️ N'y déposer **aucun secret**. Les fichiers lourds produits (voix, vidéos finales) iront dans **Cloudflare R2** (PRD §3.5/§30), pas ici.

## Sécurité (PRD §33)

- Secrets uniquement dans `.env.local` et les variables d'environnement Vercel.
- Jamais dans GitHub, le frontend, les logs, le PRD ou les fichiers publics.
- `.env.example` est versionné ; `.env*` est ignoré par git.

