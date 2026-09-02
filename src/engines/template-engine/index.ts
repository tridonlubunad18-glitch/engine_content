/**
 * TEMPLATE ENGINE — PRD §12 et §10. Phase 4.
 *
 * Templates réutilisables avec paramètres de montage ajustables :
 * - ordre des rôles (déjà ébauché en Phase 1 via TEMPLATE_ROLES) ;
 * - règles visuelles PAR RÔLE (PRD §10 : HOOK→texte fort+changement rapide,
 *   PROBLÈME→B-roll, DÉMONSTRATION→capture Goal-IA, CTA→Goal-IA+texte final) ;
 * - styles visuels (paramètres globaux : transitions, zooms, sous-titres,
 *   énergie musicale).
 *
 * Logique 100 % déterministe (PRD §3.6) — aucune IA.
 */

import {
  TEMPLATE_ROLES,
  type SceneRole,
  type ScriptTemplate,
} from "@/engines/script-engine";

export type SceneVisualMode =
  | "broll"
  | "app-capture"
  | "screenshot"
  | "goal-ia"
  | "logo"
  | "text-only";

export type TransitionType = "cut" | "zoom-in" | "fade" | "slide-up";

export type TextEmphasis = "strong" | "support" | "subtitle";

export type SubtitleStyle = "word-pop" | "bottom" | "minimal";

export type MusicEnergy = "low" | "medium" | "high";

export interface ZoomSpec {
  type: "in" | "out";
  factor: number;
}

/** Traitement visuel d'un rôle de scène (PRD §10). */
export interface RoleVisualRule {
  /** Catégories d'assets à chercher en priorité pour ce rôle. */
  preferredCategories: Array<import("@/engines/asset-engine").AssetCategory>;
  mode: SceneVisualMode;
  transition: TransitionType;
  zoom: ZoomSpec | null;
  textEmphasis: TextEmphasis;
}

export interface VisualStyle {
  id: string;
  label: string;
  subtitleStyle: SubtitleStyle;
  musicEnergy: MusicEnergy;
  /** Multiplicateur de la fréquence de zooms (0 = aucun zoom). */
  zoomIntensity: number;
}

export interface MontageTemplate {
  template: ScriptTemplate;
  roles: SceneRole[];
  roleRules: Partial<Record<SceneRole, RoleVisualRule>>;
  style: VisualStyle;
}

const SHARED_CATEGORIES = {
  broll: ["broll"] as Array<import("@/engines/asset-engine").AssetCategory>,
  goalApp: [
    "goal-ia",
    "app-videos",
    "screenshots",
  ] as Array<import("@/engines/asset-engine").AssetCategory>,
  goalAppLogo: [
    "goal-ia",
    "app-videos",
    "logos",
  ] as Array<import("@/engines/asset-engine").AssetCategory>,
};

/** Règles visuelles par rôle — indépendantes du template (PRD §10). */
const ROLE_RULES: Partial<Record<SceneRole, RoleVisualRule>> = {
  HOOK: {
    preferredCategories: SHARED_CATEGORIES.broll,
    mode: "broll",
    transition: "zoom-in",
    zoom: { type: "in", factor: 1.25 },
    textEmphasis: "strong",
  },
  PROBLEME: {
    preferredCategories: SHARED_CATEGORIES.broll,
    mode: "broll",
    transition: "cut",
    zoom: null,
    textEmphasis: "support",
  },
  ERREUR: {
    preferredCategories: SHARED_CATEGORIES.broll,
    mode: "broll",
    transition: "slide-up",
    zoom: null,
    textEmphasis: "support",
  },
  CONSEQUENCE: {
    preferredCategories: SHARED_CATEGORIES.broll,
    mode: "broll",
    transition: "fade",
    zoom: { type: "out", factor: 1.15 },
    textEmphasis: "strong",
  },
  SITUATION: {
    preferredCategories: SHARED_CATEGORIES.broll,
    mode: "broll",
    transition: "cut",
    zoom: null,
    textEmphasis: "subtitle",
  },
  DEMO: {
    preferredCategories: SHARED_CATEGORIES.goalApp,
    mode: "app-capture",
    transition: "cut",
    zoom: { type: "in", factor: 1.1 },
    textEmphasis: "support",
  },
  SOLUTION: {
    preferredCategories: SHARED_CATEGORIES.goalApp,
    mode: "goal-ia",
    transition: "zoom-in",
    zoom: { type: "in", factor: 1.15 },
    textEmphasis: "strong",
  },
  GOAL_IA: {
    preferredCategories: SHARED_CATEGORIES.goalApp,
    mode: "goal-ia",
    transition: "cut",
    zoom: null,
    textEmphasis: "support",
  },
  RESULTAT: {
    preferredCategories: SHARED_CATEGORIES.goalApp,
    mode: "app-capture",
    transition: "zoom-in",
    zoom: { type: "out", factor: 1.1 },
    textEmphasis: "strong",
  },
  ANCIEN_COMPORTEMENT: {
    preferredCategories: SHARED_CATEGORIES.broll,
    mode: "broll",
    transition: "cut",
    zoom: null,
    textEmphasis: "subtitle",
  },
  NOUVEAU_COMPORTEMENT: {
    preferredCategories: SHARED_CATEGORIES.goalApp,
    mode: "goal-ia",
    transition: "slide-up",
    zoom: null,
    textEmphasis: "support",
  },
  CTA: {
    preferredCategories: SHARED_CATEGORIES.goalAppLogo,
    mode: "logo",
    transition: "fade",
    zoom: null,
    textEmphasis: "strong",
  },
};

/** Styles visuels disponibles (PRD §11 : à corréler plus tard aux performances). */
export const VISUAL_STYLES: VisualStyle[] = [
  {
    id: "impact-rapide",
    label: "Impact rapide (hooks forts, coupes nerveuses)",
    subtitleStyle: "word-pop",
    musicEnergy: "high",
    zoomIntensity: 1,
  },
  {
    id: "clair-didactique",
    label: "Clair & didactique (captures lisibles, rythme posé)",
    subtitleStyle: "bottom",
    musicEnergy: "medium",
    zoomIntensity: 0.5,
  },
  {
    id: "emotionnel",
    label: "Émotionnel (fondu, transitions douces)",
    subtitleStyle: "minimal",
    musicEnergy: "low",
    zoomIntensity: 0.25,
  },
];

export const DEFAULT_VISUAL_STYLE_ID = "impact-rapide";

export class TemplateEngine {
  /** Retourne le montage complet (rôles + règles + style) d'un template. */
  getMontage(
    template: ScriptTemplate,
    styleId: string = DEFAULT_VISUAL_STYLE_ID,
  ): MontageTemplate {
    const style =
      VISUAL_STYLES.find((candidate) => candidate.id === styleId) ??
      VISUAL_STYLES[0];
    return {
      template,
      roles: TEMPLATE_ROLES[template],
      roleRules: ROLE_RULES,
      style,
    };
  }
}

