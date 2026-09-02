/**
 * VISUAL ENGINE — PRD §10 et §11. Phase 4.
 *
 * Transforme un script (Phase 1) en plan visuel prêt pour le montage :
 * pour CHAQUE scène → asset sélectionné (Asset Engine Phase 2), mode
 * visuel, transition, zoom, emphase de texte — selon le rôle de la scène
 * et le style visuel choisi.
 *
 * Produit aussi les caractéristiques visuelles (PRD §11) qui seront
 * corrélées aux performances plus tard (Phase 10/11) :
 * broll_ratio, goal_ia_ratio, text_overlay_ratio, transition_frequency,
 * zoom_frequency, cta_position…
 *
 * Logique 100 % déterministe (PRD §3.6) — aucune IA. Ne JAMAIS inventer
 * un asset (PRD §9) : si rien ne correspond → asset marqué manquant.
 */

import { createLogger } from "@/lib/logger";
import {
  assetEngine,
  inferCategories,
  type AssetCategory,
  type AssetRecord,
  type MissingAsset,
  type ScoredAsset,
} from "@/engines/asset-engine";
import {
  TemplateEngine,
  type MontageTemplate,
  type RoleVisualRule,
  type SceneVisualMode,
  type SubtitleStyle,
  type TextEmphasis,
  type TransitionType,
} from "@/engines/template-engine";
import type { Scene, ScriptTemplate, VideoScript } from "@/engines/script-engine";

const logger = createLogger("engine:visual");

export interface ZoomSpec {
  type: "in" | "out";
  factor: number;
}

export interface SceneVisual extends Scene {
  asset: ScoredAsset | AssetRecord | null;
  /** true si l'asset a été choisi au niveau catégorie (contenu non vérifié). */
  assetContentUnverified: boolean;
  mode: SceneVisualMode;
  transition: TransitionType;
  zoom: ZoomSpec | null;
  textEmphasis: TextEmphasis;
  subtitleStyle: SubtitleStyle;
}

/** Caractéristiques visuelles du plan (PRD §11 — pour apprentissage futur). */
export interface VisualCharacteristics {
  template: ScriptTemplate;
  styleId: string;
  sceneCount: number;
  hookDurationSec: number;
  averageSceneDurationSec: number;
  totalSceneDurationSec: number;
  brollRatio: number;
  goalIaRatio: number;
  textOverlayRatio: number;
  transitionFrequency: number;
  zoomFrequency: number;
  ctaPositionSec: number;
  subtitleStyle: SubtitleStyle;
}

export interface VisualPlan {
  scriptTitle: string;
  montage: MontageTemplate;
  scenes: SceneVisual[];
  characteristics: VisualCharacteristics;
  assetsUsed: AssetRecord[];
  missingAssets: MissingAsset[];
  warnings: string[];
}

export interface VisualPlanInput {
  script: VideoScript;
  styleId?: string;
}

const MODE_BY_CATEGORY: Record<AssetCategory, SceneVisualMode> = {
  broll: "broll",
  screenshots: "screenshot",
  "app-videos": "app-capture",
  "goal-ia": "goal-ia",
  logos: "logo",
  music: "text-only",
  templates: "text-only",
};

const GOAL_IA_MODES: readonly SceneVisualMode[] = [
  "goal-ia",
  "app-capture",
  "screenshot",
];

const STOP_TOKENS = new Set([
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
]);

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export class VisualEngine {
  constructor(private readonly templateEngine = new TemplateEngine()) {}

  /**
   * Construit le plan visuel complet d'un script : sélection d'asset par
   * scène, mode visuel, transition, zoom, emphase de texte, statistiques
   * (PRD §11) et signalement des assets manquants (PRD §9).
   */
  async buildVisualPlan(input: VisualPlanInput): Promise<VisualPlan> {
    const montage = this.templateEngine.getMontage(
      input.script.template,
      input.styleId,
    );
    const style = montage.style;
    const assets = await assetEngine.scan();

    const scenesVisual: SceneVisual[] = [];
    const assetsUsed: AssetRecord[] = [];
    const missingAssets: MissingAsset[] = [];
    const warnings: string[] = [];
    const usedIds = new Set<string>();

    for (const scene of input.script.scenes) {
      const rule = montage.roleRules[scene.role];
      if (!rule) {
        warnings.push(`Rôle de scène sans règle visuelle : ${scene.role}`);
        scenesVisual.push({
          ...scene,
          asset: null,
          assetContentUnverified: false,
          mode: "text-only",
          transition: "cut",
          zoom: null,
          textEmphasis: "subtitle",
          subtitleStyle: style.subtitleStyle,
        });
        continue;
      }

      const ranked = this.rankForScene(assets, scene, rule);
      let asset: ScoredAsset | AssetRecord | null = ranked[0] ?? null;
      let assetContentUnverified = false;

      if (!asset) {
        const fallback = this.pickCategoryFallback(
          assets,
          rule.preferredCategories,
        );
        if (fallback) {
          asset = fallback;
          assetContentUnverified = true;
          warnings.push(
            `Fallback catégoriel « ${fallback.category} » pour la scène ${scene.role} — contenu non vérifié (noms Pixabay).`,
          );
        } else {
          missingAssets.push({
            description: scene.visualHint || scene.narration,
            category: rule.preferredCategories[0],
            quantity: 1,
            available: 0,
            reason: "Aucun asset disponible dans les catégories attendues pour ce rôle.",
          });
          logger.warn("Visual plan : scène sans asset", {
            role: scene.role,
            visualHint: scene.visualHint,
          });
        }
      }

      if (asset && !usedIds.has(asset.id)) {
        usedIds.add(asset.id);
        assetsUsed.push(asset);
      }

      const zoom =
        style.zoomIntensity > 0 && rule.zoom ? rule.zoom : null;
      const mode: SceneVisualMode = asset
        ? (MODE_BY_CATEGORY[asset.category] ?? rule.mode)
        : "text-only";

      scenesVisual.push({
        ...scene,
        asset,
        assetContentUnverified,
        mode,
        transition: rule.transition,
        zoom,
        textEmphasis: rule.textEmphasis,
        subtitleStyle: style.subtitleStyle,
      });
    }

    const characteristics = this.computeCharacteristics(
      input.script.template,
      scenesVisual,
      style.subtitleStyle,
      style.id,
    );

    logger.info("Visual plan construit", {
      title: input.script.title,
      template: input.script.template,
      scenes: characteristics.sceneCount,
      missingAssets: missingAssets.length,
      totalDurationSec: characteristics.totalSceneDurationSec,
    });

    return {
      scriptTitle: input.script.title,
      montage,
      scenes: scenesVisual,
      characteristics,
      assetsUsed,
      missingAssets,
      warnings,
    };
  }

  /** Classe les assets d'une scène (score mots-clés + catégories), déterministe. */
  private rankForScene(
    assets: AssetRecord[],
    scene: Scene,
    rule: RoleVisualRule,
  ): ScoredAsset[] {
    const rawText = `${scene.visualHint} ${scene.onScreenText} ${scene.narration}`;
    const lowerText = rawText.toLowerCase();
    const tokens = [
      ...new Set(
        lowerText
          .split(/[^a-z0-9àâäéèêëîïôöùûüç]+/)
          .filter(
            (token) =>
              token.length >= 3 &&
              !STOP_TOKENS.has(token) &&
              !/^\d{4,}$/.test(token),
          ),
      ),
    ];
    const inferred = inferCategories(rawText);
    const allowed = new Set(rule.preferredCategories);

    const scored: ScoredAsset[] = [];
    for (const asset of assets) {
      if (!allowed.has(asset.category)) continue;

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
    return scored.slice(0, 3);
  }

  /** Repli déterministe : premier fichier de la 1ʳᵉ catégorie attendue. */
  private pickCategoryFallback(
    assets: AssetRecord[],
    categories: readonly AssetCategory[],
  ): AssetRecord | null {
    for (const category of categories) {
      const matches = assets
        .filter((asset) => asset.category === category)
        .sort((a, b) => a.fileName.localeCompare(b.fileName, "fr"));
      if (matches.length > 0) return matches[0];
    }
    return null;
  }

  /** Calcule les caractéristiques visuelles (PRD §11). */
  private computeCharacteristics(
    template: ScriptTemplate,
    scenes: SceneVisual[],
    subtitleStyle: SubtitleStyle,
    styleId: string,
  ): VisualCharacteristics {
    const total =
      scenes.length > 0
        ? scenes.reduce((sum, scene) => sum + scene.durationSec, 0)
        : 0;
    const safeTotal = total || 1;

    const brollDuration = scenes
      .filter((scene) => scene.mode === "broll")
      .reduce((sum, scene) => sum + scene.durationSec, 0);
    const goalIaDuration = scenes
      .filter((scene) => GOAL_IA_MODES.includes(scene.mode))
      .reduce((sum, scene) => sum + scene.durationSec, 0);
    const textDuration = scenes
      .filter((scene) => scene.textEmphasis !== "subtitle")
      .reduce((sum, scene) => sum + scene.durationSec, 0);
    const transitionCount = scenes.filter(
      (scene) => scene.transition !== "cut",
    ).length;
    const zoomCount = scenes.filter((scene) => scene.zoom !== null).length;

    let ctaPositionSec = 0;
    let offset = 0;
    for (const scene of scenes) {
      if (scene.role === "CTA") {
        ctaPositionSec = offset;
        break;
      }
      offset += scene.durationSec;
    }

    return {
      template,
      styleId,
      sceneCount: scenes.length,
      hookDurationSec: scenes[0]?.durationSec ?? 0,
      averageSceneDurationSec:
        scenes.length > 0 ? round(total / scenes.length, 1) : 0,
      totalSceneDurationSec: total,
      brollRatio: round(brollDuration / safeTotal, 2),
      goalIaRatio: round(goalIaDuration / safeTotal, 2),
      textOverlayRatio: round(textDuration / safeTotal, 2),
      transitionFrequency: round(
        transitionCount / Math.max(scenes.length - 1, 1),
        2,
      ),
      zoomFrequency: round(zoomCount / Math.max(scenes.length, 1), 2),
      ctaPositionSec,
      subtitleStyle,
    };
  }
}

/** Instance partagée. */
export const visualEngine = new VisualEngine();



