/**
 * ASSET ENGINE — PRD §8 (Assets) et §9 (Assets manquants). Phase 2.
 *
 * Bibliothèque LOCALE d'assets (`assets/`, privée — jamais commitée).
 * Règles appliquées :
 * - ne JAMAIS inventer un asset (PRD §9) : chercher → trouver → utiliser,
 *   sinon chercher → introuvable → signaler ;
 * - logique 100 % déterministe en code (PRD §3.6) : scan, tri, catégorisation,
 *   recherche par mots-clés — aucune IA ;
 * - la notification WhatsApp réelle arrive en Phase 8 (PRD §37) : en attendant,
 *   les manques sont journalisés et renvoyés en statut.
 *
 * Limite connue : les noms de fichiers B-roll type Pixabay (identifiants
 * numériques) ne décrivent pas le contenu → la recherche y est catégorielle
 * (niveau catégorie), le contenu réel reste à vérifier humainement.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createLogger } from "@/lib/logger";

const logger = createLogger("engine:asset");

export const ASSET_CATEGORIES = [
  "goal-ia",
  "screenshots",
  "app-videos",
  "broll",
  "music",
  "logos",
  "templates",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export interface AssetRecord {
  /** Identifiant stable = chemin relatif (séparateurs /). */
  id: string;
  category: AssetCategory;
  fileName: string;
  extension: string;
  keywords: string[];
  sizeBytes: number;
  relativePath: string;
}

export interface ScoredAsset extends AssetRecord {
  score: number;
  /** Termes de la requête qui ont contribué au score. */
  matchedTokens: string[];
}

export interface AssetSearchQuery {
  text: string;
  /** Restriction optionnelle aux catégories listées. */
  categories?: AssetCategory[];
  limit?: number;
}

export interface AssetDemand {
  /** Description du besoin (ex. visualHint d'une scène). */
  description: string;
  /** Catégorie exigée, si connue. */
  category?: AssetCategory;
  /** Nombre d'assets souhaités (défaut 1). */
  quantity?: number;
}

export interface MissingAsset {
  description: string;
  category?: AssetCategory;
  quantity: number;
  available: number;
  reason: string;
}

export interface DemandResult {
  demand: AssetDemand;
  candidates: ScoredAsset[];
  missing: MissingAsset | null;
}

const ALLOWED_EXTENSIONS: Record<AssetCategory, readonly string[]> = {
  "goal-ia": [".mp4", ".mov", ".webm", ".m4v"],
  screenshots: [".png", ".jpg", ".jpeg", ".webp"],
  "app-videos": [".mp4", ".mov", ".webm", ".m4v"],
  broll: [".mp4", ".mov", ".webm", ".m4v", ".png", ".jpg", ".jpeg", ".webp"],
  music: [".mp3", ".wav", ".m4a", ".ogg"],
  logos: [".png", ".svg", ".jpg", ".jpeg", ".webp"],
  templates: [".mp4", ".mov", ".webm", ".m4v", ".zip", ".json", ".png", ".jpg"],
};

/** Synonymes français/anglais → catégorie (déterminisme, PRD §3.6). */
export const CATEGORY_ALIASES: Record<string, AssetCategory> = {
  "b-roll": "broll",
  broll: "broll",
  plan: "broll",
  illustration: "broll",
  stock: "broll",
  capture: "screenshots",
  captures: "screenshots",
  screenshot: "screenshots",
  screenshots: "screenshots",
  ecran: "screenshots",
  "écran": "screenshots",
  interface: "screenshots",
  application: "app-videos",
  "app video": "app-videos",
  demo: "app-videos",
  "démo": "app-videos",
  enregistrement: "app-videos",
  video: "app-videos",
  "vidéo": "app-videos",
  logo: "logos",
  musique: "music",
  music: "music",
  audio: "music",
  son: "music",
  template: "templates",
  goalia: "goal-ia",
  "goal-ia": "goal-ia",
  produit: "goal-ia",
  marque: "goal-ia",
};

const STOP_WORDS = new Set([
  "de",
  "la",
  "le",
  "les",
  "du",
  "des",
  "et",
  "ou",
  "un",
  "une",
  "pour",
  "avec",
  "sur",
  "dans",
  "au",
  "aux",
  "the",
  "medium",
]);

function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, "$1 $2");
  return [
    ...new Set(
      cleaned
        .split(/[^a-z0-9àâäéèêëîïôöùûüç]+/)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 3 &&
            !STOP_WORDS.has(token) &&
            !/^\d{4,}$/.test(token),
        ),
    ),
  ];
}

function extractKeywords(fileName: string): string[] {
  return tokenize(fileName.replace(/\.[^.]+$/, ""));
}

export function resolveAssetsRoot(): string {
  return path.resolve(process.cwd(), "assets");
}

export function inferCategories(text: string): Set<AssetCategory> {
  const found = new Set<AssetCategory>();
  const lower = text.toLowerCase();
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) {
      found.add(category);
    }
  }
  return found;
}

export class AssetEngine {
  /**
   * Indexe la bibliothèque locale `assets/` (PRD §8). Déterministe.
   * Retourne un enregistrement par fichier utilisable, catégorisé.
   */
  async scan(): Promise<AssetRecord[]> {
    const root = resolveAssetsRoot();
    const records: AssetRecord[] = [];

    try {
      await fs.access(root);
    } catch {
      logger.warn("Dossier assets/ introuvable — scan vide", { root });
      return records;
    }

    for (const category of ASSET_CATEGORIES) {
      const dir = path.join(root, category);
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        continue; // catégorie absente → ignorée
      }
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name === "README.md") continue;
        if (entry.name.startsWith(".")) continue;

        const extension = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS[category].includes(extension)) {
          logger.debug("Extension non reconnue — asset ignoré", {
            file: entry.name,
            extension,
          });
          continue;
        }

        const absPath = path.join(dir, entry.name);
        const stat = await fs.stat(absPath).catch(() => null);
        const relativePath = path.posix.join(category, entry.name);

        records.push({
          id: relativePath,
          category,
          fileName: entry.name,
          extension,
          keywords: extractKeywords(entry.name),
          sizeBytes: stat?.size ?? 0,
          relativePath,
        });
      }
    }

    logger.info("Scan de la bibliothèque d'assets terminé", {
      root,
      count: records.length,
    });
    return records;
  }

  /**
   * Recherche déterministe par mots-clés + catégorie (PRD §3.6).
   */
  async search(query: AssetSearchQuery): Promise<ScoredAsset[]> {
    const assets = await this.scan();
    const categories = query.categories ?? [...ASSET_CATEGORIES];
    const limit = Math.max(1, Math.floor(query.limit ?? 10));
    return this.scoreAndRank(assets, query.text, categories, limit);
  }

  /**
   * Pour une liste de demandes (visualHint de scènes…), retourne les
   * candidats trouvés ou un signalement d'asset manquant (PRD §9).
   * La notification WhatsApp réelle est différée à la Phase 8 ; ici le
   * manque est journalisé (warn) et retourné en statut.
   */
  async detectMissing(demands: AssetDemand[]): Promise<DemandResult[]> {
    const assets = await this.scan();
    const results: DemandResult[] = [];

    for (const demand of demands) {
      const quantity = Math.max(1, Math.floor(demand.quantity ?? 1));
      const allowed: AssetCategory[] = demand.category
        ? [demand.category]
        : [...ASSET_CATEGORIES];

      const ranked = this.scoreAndRank(
        assets,
        demand.description,
        allowed,
        quantity * 3,
      );
      const candidates = ranked.slice(0, quantity);
      const available = ranked.length;

      let missing: MissingAsset | null = null;
      if (available === 0) {
        missing = {
          description: demand.description,
          category: demand.category,
          quantity,
          available: 0,
          reason: this.explainMissing(demand),
        };
      } else if (available < quantity) {
        missing = {
          description: demand.description,
          category: demand.category,
          quantity,
          available,
          reason: `Quantité insuffisante : ${available} disponible(s) pour ${quantity} demandé(s).`,
        };
      }

      if (missing) {
        logger.warn(
          "⚠️ ASSET MANQUANT — vidéo à bloquer (statut BLOCKED, PRD §9)",
          {
            description: missing.description,
            reason: missing.reason,
            category: missing.category ?? "indéterminée",
          },
        );
      }

      results.push({ demand, candidates, missing });
    }

    return results;
  }

  private scoreAndRank(
    assets: AssetRecord[],
    text: string,
    allowed: AssetCategory[],
    limit: number,
  ): ScoredAsset[] {
    const tokens = tokenize(text);
    const inferred = inferCategories(text);
    const allowedSet = new Set(allowed);

    const scored: ScoredAsset[] = [];
    for (const asset of assets) {
      if (!allowedSet.has(asset.category)) continue;

      let score = 0;
      const matchedTokens: string[] = [];
      const fileNameLower = asset.fileName.toLowerCase();

      for (const token of tokens) {
        if (asset.keywords.includes(token)) {
          score += 3;
          matchedTokens.push(token);
        } else if (fileNameLower.includes(token)) {
          score += 1;
          matchedTokens.push(token);
        }
      }
      if (inferred.has(asset.category)) {
        score += 2;
        matchedTokens.push(`catégorie:${asset.category}`);
      }

      if (score > 0) {
        scored.push({
          ...asset,
          score,
          matchedTokens: [...new Set(matchedTokens)],
        });
      }
    }

    scored.sort(
      (a, b) =>
        b.score - a.score || a.fileName.localeCompare(b.fileName, "fr"),
    );
    return scored.slice(0, limit);
  }

  private explainMissing(demand: AssetDemand): string {
    const cats = inferCategories(demand.description);
    if (demand.category) {
      return `Aucun asset trouvé dans « assets/${demand.category}/ » pour cette demande. À fournir (PRD §9).`;
    }
    if (cats.size > 0) {
      const folders = [...cats].map((c) => `assets/${c}/`).join(", ");
      return `Aucun asset trouvé dans ${folders} pour cette demande. À fournir (PRD §9).`;
    }
    return "Catégorie indéterminée et aucun mot-clé reconnu : préciser la demande (description ou catégorie). À fournir (PRD §9).";
  }
}

/** Instance partagée (sans état persistant : chaque appel rescanné). */
export const assetEngine = new AssetEngine();




