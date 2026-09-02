/**
 * STRATEGY ENGINE — PRD §5 (Flux complet) et §6 (Content Engine, mode
 * automatique).
 *
 * À partir d'idées / données marketing brutes, produit un plan
 * stratégique : quelles directions de contenu produire, avec quelle
 * priorité et quel angle initial.
 *
 * Phase 1 — implémentation (DeepSeek pour l'analyse marketing ;
 * toute logique déterministe reste en code : PRD §3.6).
 */

import { chatJson, type ChatProvider } from "@/lib/ai";
import {
  DEFAULT_AUDIENCE,
  DEFAULT_BRAND_CONTEXT,
  DEFAULT_GOAL,
} from "@/lib/brand";
import { deepSeek } from "@/providers/deepseek";

export type Priority = "high" | "medium" | "low";

export interface StrategyInput {
  /** Idées / sujets candidats (texte libre, liste). */
  ideas: string[];
  brandContext?: string;
  audience?: string;
  goal?: string;
  /** Contraintes supplémentaires (ton, format, hors-sujets…). */
  constraints?: string;
  /** Nombre maximum de directions recommandées (défaut 3). */
  maxDirections?: number;
}

export interface ContentDirection {
  idea: string;
  priority: Priority;
  /** Angle suggéré par le stratège pour cette idée. */
  suggestedAngle: string;
  why: string;
}

export interface StrategyPlan {
  directions: ContentDirection[];
  reasoning: string;
}

const PRIORITIES: readonly Priority[] = ["high", "medium", "low"];

export class StrategyEngine {
  constructor(private readonly provider: ChatProvider = deepSeek) {}

  async analyze(input: StrategyInput): Promise<StrategyPlan> {
    const maxDirections = Math.min(
      Math.max(input.maxDirections ?? 3, 1),
      5,
    );
    const ideas = input.ideas.filter((idea) => idea.trim().length > 0);

    const userPrompt = `IDÉES CANDIDATES :
${ideas.map((idea, index) => `${index + 1}. ${idea}`).join("\n") || "(aucune — propose des directions à partir de ton analyse)"}

CONTEXTE :
- Marque : ${input.brandContext ?? DEFAULT_BRAND_CONTEXT}
- Cible : ${input.audience ?? DEFAULT_AUDIENCE}
- Objectif : ${input.goal ?? DEFAULT_GOAL}
${input.constraints ? `- Contraintes : ${input.constraints}` : ""}

Travail demandé :
1. Sélectionne et classe les ${maxDirections} directions de contenu les plus prometteuses (idée + angle + raison) pour des vidéos verticales courtes (30-60 s).
2. Justifie en une phrase courte le choix global.

Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "directions": [
    {
      "idea": "idée choisie (réécrite si besoin, précise)",
      "priority": "high | medium | low",
      "suggestedAngle": "angle de traitement marketing",
      "why": "pourquoi cette direction peut convertir"
    }
  ],
  "reasoning": "justification globale courte"
}`;

    const plan = await chatJson<StrategyPlan>(
      this.provider,
      [
        {
          role: "system",
          content:
            "Tu es le stratège marketing senior d'une application d'aide à la décision pour parieurs sportifs. Tu choisis des directions de contenu capables d'arrêter le scroll, d'être comprises en 3 secondes et de générer des inscriptions. Ton style est franc, direct, sans jargon.",
        },
        { role: "user", content: userPrompt },
      ],
      "StrategyPlan",
      { temperature: 0.4 },
    );

    const normalized: StrategyPlan = {
      directions: (plan?.directions ?? [])
        .filter(
          (d): d is ContentDirection =>
            Boolean(
              d &&
                typeof d.idea === "string" &&
                d.idea.trim().length > 0 &&
                typeof d.suggestedAngle === "string",
            ),
        )
        .map((d) => ({
          idea: d.idea.trim(),
          priority: PRIORITIES.includes(d.priority) ? d.priority : "medium",
          suggestedAngle: d.suggestedAngle.trim(),
          why: typeof d.why === "string" ? d.why.trim() : "",
        }))
        .slice(0, maxDirections),
      reasoning:
        typeof plan?.reasoning === "string" ? plan.reasoning.trim() : "",
    };

    return normalized;
  }
}

