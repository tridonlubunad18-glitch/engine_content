/**
 * SCRIPT ENGINE — PRD §1 (Pipeline), §7 (production) et §12 (templates).
 *
 * Produit un script complet de vidéo verticale 30-60 s :
 * hook parlé, découpage en scènes selon un template réutilisable,
 * voix off complète (budget de mots calculé en code), et CTA.
 *
 * Phase 1 — implémentation (DeepSeek + contrôles déterministes en code).
 */

import { chatJson, type ChatProvider } from "@/lib/ai";
import {
  DEFAULT_AUDIENCE,
  DEFAULT_BRAND_CONTEXT,
  DEFAULT_GOAL,
} from "@/lib/brand";
import { deepSeek } from "@/providers/deepseek";
import type { AngleOption } from "@/engines/angle-engine";
import type { HookOption } from "@/engines/hook-engine";

export type ScriptTemplate =
  | "problem-solution"
  | "erreur-consequence-solution"
  | "demonstration"
  | "comparaison";

export type SceneRole =
  | "HOOK"
  | "PROBLEME"
  | "ERREUR"
  | "CONSEQUENCE"
  | "DEMO"
  | "SITUATION"
  | "SOLUTION"
  | "GOAL_IA"
  | "RESULTAT"
  | "ANCIEN_COMPORTEMENT"
  | "NOUVEAU_COMPORTEMENT"
  | "CTA";

export interface Scene {
  role: SceneRole;
  /** Narration parlée de la scène (voix off). */
  narration: string;
  /** Texte affiché à l'écran (sous-titre fort), optionnel. */
  onScreenText: string;
  /** Indication visuelle pour le futur montage (PRD §10). */
  visualHint: string;
  durationSec: number;
}

export interface VideoScript {
  title: string;
  template: ScriptTemplate;
  durationSec: number;
  hookText: string;
  scenes: Scene[];
  /** Voix off complète = concaténation des narrations (à lire à l'oral). */
  voiceoverText: string;
  cta: string;
  estimatedWords: number;
}

export interface ScriptRequest {
  topic: string;
  angle: AngleOption;
  hook: HookOption;
  template: ScriptTemplate;
  /** Durée cible entre 30 et 60 secondes (défaut 45). */
  durationSec?: number;
  cta?: string;
  brandContext?: string;
  audience?: string;
  goal?: string;
}

export type VariantFocus = "hook" | "cta" | "ton";

export interface ScriptVariant {
  label: string;
  focus: VariantFocus;
  hookText: string;
  voiceoverText: string;
  cta: string;
  durationSec: number;
  estimatedWords: number;
}

export const DEFAULT_CTA =
  "Télécharge Goal-IA et construis enfin des coupons qui tiennent la route.";

/** Débit oral moyen retenu pour cadrer la durée (mots / minute). */
export const WORDS_PER_MINUTE = 150;

export const TEMPLATE_ROLES: Record<ScriptTemplate, SceneRole[]> = {
  "problem-solution": ["HOOK", "PROBLEME", "DEMO", "SOLUTION", "CTA"],
  "erreur-consequence-solution": [
    "HOOK",
    "ERREUR",
    "CONSEQUENCE",
    "GOAL_IA",
    "CTA",
  ],
  demonstration: ["HOOK", "SITUATION", "DEMO", "RESULTAT", "CTA"],
  comparaison: [
    "HOOK",
    "ANCIEN_COMPORTEMENT",
    "PROBLEME",
    "NOUVEAU_COMPORTEMENT",
    "GOAL_IA",
    "CTA",
  ],
};

const ALL_SCENE_ROLES: readonly SceneRole[] = [
  "HOOK",
  "PROBLEME",
  "ERREUR",
  "CONSEQUENCE",
  "DEMO",
  "SITUATION",
  "SOLUTION",
  "GOAL_IA",
  "RESULTAT",
  "ANCIEN_COMPORTEMENT",
  "NOUVEAU_COMPORTEMENT",
  "CTA",
];

/** Représentation brute (non validée) retournée par le modèle. */
interface RawScript {
  title?: unknown;
  scenes?: Array<{
    role?: unknown;
    narration?: unknown;
    onScreenText?: unknown;
    visualHint?: unknown;
    durationSec?: unknown;
  }>;
  voiceoverText?: unknown;
  cta?: unknown;
}

/** Variante brute retournée par le modèle. */
interface RawScriptVariant {
  label?: unknown;
  hookText?: unknown;
  voiceoverText?: unknown;
  cta?: unknown;
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.length > 1 || (words.length === 1 && words[0].length > 0)
    ? words.length
    : 0;
}

/** Budget de mots pour une durée donnée (inclut le CTA parlé). */
export function budgetForDuration(durationSec: number): number {
  return Math.floor((durationSec / 60) * WORDS_PER_MINUTE);
}

export class ScriptEngine {
  constructor(private readonly provider: ChatProvider = deepSeek) {}

  async generateScript(request: ScriptRequest): Promise<VideoScript> {
    const durationSec = Math.min(Math.max(request.durationSec ?? 45, 30), 60);
    const maxWords = budgetForDuration(durationSec);
    const cta = request.cta?.trim() || DEFAULT_CTA;
    const templateRoles = TEMPLATE_ROLES[request.template];

    const buildPrompt = (extraInstruction = "") => {
      const userPrompt = `SUJET : ${request.topic}

ANGLE :
- Titre : ${request.angle.title}
- Résumé : ${request.angle.summary}
- Besoin cible : ${request.angle.audienceNeed}

HOOK RETENU (à intégrer tel quel en scène HOOK) :
« ${request.hook.text} »

CONTEXTE :
- Marque : ${request.brandContext ?? DEFAULT_BRAND_CONTEXT}
- Cible : ${request.audience ?? DEFAULT_AUDIENCE}
- Objectif : ${request.goal ?? DEFAULT_GOAL}

TEMPLATE IMPOSÉ : ${request.template}
ORDRE DES RÔLES DE SCÈNES : ${templateRoles.join(" → ")}

CONTRAINTES DE FORMAT :
- Durée cible : ${durationSec} secondes.
- Budget de voix off : ${maxWords} mots maximum (≈ ${(WORDS_PER_MINUTE / 60).toFixed(1)} mot/seconde).
- Rythme oral, phrases courtes, zéro jargon, aucune promesse mensongère.
- CTA final à dire à l'oral : « ${cta} »
${extraInstruction}

Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "title": "titre interne du contenu (court)",
  "scenes": [
    {
      "role": "${templateRoles.join(" | ")}",
      "narration": "texte parlé de la scène",
      "onScreenText": "texte court affiché à l'écran ou chaîne vide",
      "visualHint": "indication visuelle pour le montage (B-roll, capture Goal-IA...)",
      "durationSec": 4
    }
  ],
  "voiceoverText": "voix off complète = concaténation des narrations, SANS répéter le hook ni le CTA séparément",
  "cta": "${cta}"
}`;
      return userPrompt;
    };

    let raw = await this.askJson(buildPrompt());
    let script = this.normalizeScript(raw, {
      request,
      durationSec,
      maxWords,
      cta,
    });

    if (countWords(script.voiceoverText) > Math.ceil(maxWords * 1.2)) {
      raw = await this.askJson(
        buildPrompt(
          `IMPORTANT : le script précédent dépassait le budget de ${maxWords} mots. Raccourcis en supprimant les répétitions et en allant à l'essentiel : une seule idée par scène, phrases courtes.`,
        ),
      );
      script = this.normalizeScript(raw, {
        request,
        durationSec,
        maxWords,
        cta,
      });
    }

    return script;
  }

  private async askJson(userPrompt: string): Promise<RawScript> {
    return chatJson<RawScript>(
      this.provider,
      [
        {
          role: "system",
          content:
            "Tu es un auteur de scripts pour vidéos verticales courtes d'une application d'aide au pari sportif. Tu écris à l'oral, en français simple, avec des phrases courtes et zéro contenu mensonger. Tu respectes strictement le template et le budget de mots. IMPORTANT : ne rédige AUCUN raisonnement préalable, aucune explication, aucun plan : produis directement et immédiatement le JSON demandé.",
        },
        { role: "user", content: userPrompt },
      ],
      "VideoScript",
      { temperature: 0.7 },
    );
  }

  private normalizeScript(
    raw: RawScript,
    context: {
      request: ScriptRequest;
      durationSec: number;
      maxWords: number;
      cta: string;
    },
  ): VideoScript {
    const { request, durationSec, cta } = context;
    const asString = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";
    const asNumber = (value: unknown, fallback: number): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0
        ? Math.round(parsed)
        : fallback;
    };

    const scenes: Scene[] = (Array.isArray(raw?.scenes) ? raw.scenes : [])
      .filter(
        (scene): scene is NonNullable<RawScript["scenes"]>[number] =>
          Boolean(scene && asString(scene.narration).length > 0),
      )
      .flatMap((scene) => {
        const role = asString(scene?.role).toUpperCase() as SceneRole;
        if (!ALL_SCENE_ROLES.includes(role)) {
          return [];
        }
        const narration = asString(scene?.narration);
        if (!narration) {
          return [];
        }
        const sceneValue: Scene = {
          role,
          narration,
          onScreenText: asString(scene?.onScreenText),
          visualHint: asString(scene?.visualHint),
          durationSec: Math.min(Math.max(asNumber(scene?.durationSec, 3), 1), 15),
        };
        return [sceneValue];
      });

    const voiceoverText =
      asString(raw?.voiceoverText) ||
      scenes.map((scene) => scene.narration).join(" ");
    const ctaValue = asString(raw?.cta) || cta;

    return {
      title: asString(raw?.title) || `Contenu Goal-IA — ${request.template}`,
      template: request.template,
      durationSec,
      hookText: request.hook.text,
      scenes,
      voiceoverText,
      cta: ctaValue,
      estimatedWords: countWords(voiceoverText) + countWords(ctaValue),
    };
  }

  async generateVariants(input: {
    script: VideoScript;
    count?: number;
    focus?: VariantFocus;
  }): Promise<ScriptVariant[]> {
    const count = Math.min(Math.max(input.count ?? 2, 1), 3);
    const focus: VariantFocus = input.focus ?? "hook";
    const script = input.script;
    const maxWords = budgetForDuration(script.durationSec);

    const focusInstruction: Record<VariantFocus, string> = {
      hook: "Change UNIQUEMENT le hook (l'accroche des 2 premières secondes) : autre mécanisme, autre émotion. Le reste du script reste identique.",
      cta: "Garde tout le script et change UNIQUEMENT le CTA final : autre formulation, même promesse honnête.",
      ton:
        "Garde la structure, les faits, le hook et le CTA, mais change le ton général (plus direct, plus émotionnel, ou plus concret).",
    };

    const userPrompt = `SCRIPT SOURCE :
- Titre : ${script.title}
- Durée : ${script.durationSec} s (budget voix off : ${maxWords} mots max)
- Hook : « ${script.hookText} »
- Voix off : ${script.voiceoverText}
- CTA : « ${script.cta} »

TRAVAIL DEMANDÉ : produis ${count} variante(s) de ce script.
Consigne pour la variante : ${focusInstruction[focus]}
Règles : aucune promesse mensongère ; ton oral français ; chaque voix off est COMPLÈTE (elle commence par le hook réécrit s'il change) et reste dans le budget de ${maxWords} mots.

Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "variants": [
    {
      "label": "nom court de la variante",
      "hookText": "hook de la variante",
      "voiceoverText": "voix off complète de la variante",
      "cta": "CTA de la variante"
    }
  ]
}`;

    const raw = await chatJson<{ variants?: RawScriptVariant[] }>(
      this.provider,
      [
        {
          role: "system",
          content:
            "Tu es un auteur de scripts pour vidéos courtes. Tu produis des variantes honnêtes et percutantes, en respectant strictement la consigne de focus demandée. IMPORTANT : ne rédige AUCUN raisonnement préalable : produis directement et immédiatement le JSON demandé.",
        },
        { role: "user", content: userPrompt },
      ],
      "ScriptVariants",
      { temperature: 0.8 },
    );

    const asString = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";

    return (raw?.variants ?? [])
      .filter(
        (variant): variant is RawScriptVariant =>
          Boolean(
            variant &&
              (asString(variant.voiceoverText).length > 0 ||
                asString(variant.hookText).length > 0),
          ),
      )
      .slice(0, count)
      .map((variant, index) => {
        const label = asString(variant.label) || `Variante ${index + 1}`;
        const hookText = asString(variant.hookText) || script.hookText;
        const voiceoverText =
          asString(variant.voiceoverText) || script.voiceoverText;
        const cta = asString(variant.cta) || script.cta;
        return {
          label,
          focus,
          hookText,
          voiceoverText,
          cta,
          durationSec: script.durationSec,
          estimatedWords: countWords(voiceoverText) + countWords(cta),
        };
      });
  }
}

