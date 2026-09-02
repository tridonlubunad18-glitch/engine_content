/**
 * ANGLE ENGINE — PRD §1 (Pipeline) : ANALYSE → STRATÉGIE → ANGLE.
 *
 * Transforme une idée / direction stratégique en plusieurs angles de
 * contenu exploitables (le même sujet peut être traité différemment).
 *
 * Phase 1 — implémentation (DeepSeek).
 */

import { chatJson, type ChatProvider } from "@/lib/ai";
import {
  DEFAULT_AUDIENCE,
  DEFAULT_BRAND_CONTEXT,
  DEFAULT_GOAL,
} from "@/lib/brand";
import { deepSeek } from "@/providers/deepseek";

export interface AngleRequest {
  idea: string;
  brandContext?: string;
  audience?: string;
  goal?: string;
  /** Nombre d'angles demandés (défaut 4). */
  count?: number;
}

export interface AngleOption {
  /** Titre court et accrocheur de l'angle. */
  title: string;
  /** Catégorie d'angle : peur, gain, contraste, preuve, curiosité… */
  angleType: string;
  /** Résumé en 1-2 phrases de l'angle. */
  summary: string;
  /** Le besoin/la douleur de la cible auquel l'angle répond. */
  audienceNeed: string;
  /** Piste pour le hook (comment ouvrir la vidéo). */
  hookDirection: string;
}

export class AngleEngine {
  constructor(private readonly provider: ChatProvider = deepSeek) {}

  async generateAngles(request: AngleRequest): Promise<AngleOption[]> {
    const count = Math.min(Math.max(request.count ?? 4, 2), 6);

    const userPrompt = `SUJET / IDÉE : ${request.idea}

CONTEXTE :
- Marque : ${request.brandContext ?? DEFAULT_BRAND_CONTEXT}
- Cible : ${request.audience ?? DEFAULT_AUDIENCE}
- Objectif : ${request.goal ?? DEFAULT_GOAL}

Travail demandé :
Propose ${count} angles marketing différents et réellement distincts pour une vidéo verticale courte (30-60 s) sur ce sujet. Chaque angle doit correspondre à une promesse émotionnelle ou rationnelle différente.

Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "angles": [
    {
      "title": "titre de l'angle (max 8 mots)",
      "angleType": "peur | gain | contraste | preuve | curiosite | identite | urgence",
      "summary": "résumé en 1-2 phrases",
      "audienceNeed": "douleur/besoin de la cible visé",
      "hookDirection": "piste concrète pour l'accroche"
    }
  ]
}`;

    const result = await chatJson<{ angles?: AngleOption[] }>(
      this.provider,
      [
        {
          role: "system",
          content:
            "Tu es un rédacteur marketing spécialisé dans les vidéos courtes pour applications SaaS de paris sportifs. Tu trouves des angles qui accrochent un parieur en scrollant, sans promesses mensongères.",
        },
        { role: "user", content: userPrompt },
      ],
      "AngleOptions",
      { temperature: 0.7 },
    );

    return (result?.angles ?? [])
      .filter(
        (angle): angle is AngleOption =>
          Boolean(
            angle &&
              typeof angle.title === "string" &&
              angle.title.trim().length > 0 &&
              typeof angle.summary === "string",
          ),
      )
      .map((angle) => ({
        title: angle.title.trim(),
        angleType:
          typeof angle.angleType === "string"
            ? angle.angleType.trim()
            : "curiosite",
        summary: angle.summary.trim(),
        audienceNeed:
          typeof angle.audienceNeed === "string"
            ? angle.audienceNeed.trim()
            : "",
        hookDirection:
          typeof angle.hookDirection === "string"
            ? angle.hookDirection.trim()
            : "",
      }))
      .slice(0, count);
  }
}

