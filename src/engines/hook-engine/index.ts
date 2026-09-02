/**
 * HOOK ENGINE — PRD §1 (Pipeline) : ANGLE → HOOK.
 *
 * Génère les accroches (hooks) d'une vidéo. Le hook est décisif pour
 * la rétention : il doit arrêter le scroll dans les 2 premières
 * secondes et annoncer la promesse de l'angle.
 *
 * Phase 1 — implémentation (DeepSeek).
 */

import { chatJson, type ChatProvider } from "@/lib/ai";
import { deepSeek } from "@/providers/deepseek";
import type { AngleOption } from "@/engines/angle-engine";

export type HookStyle =
  | "question"
  | "statistique"
  | "contre-intuitif"
  | "histoire"
  | "direct"
  | "peur";

export interface HookRequest {
  topic: string;
  angle: AngleOption;
  /** Nombre de hooks demandés (défaut 5). */
  count?: number;
}

export interface HookOption {
  /** Texte du hook, parlé à l'oral (≤ ~10 mots pour rester punchy). */
  text: string;
  style: HookStyle;
  /** Émotion / mécanisme déclenché. */
  trigger: string;
}

const HOOK_STYLES: readonly HookStyle[] = [
  "question",
  "statistique",
  "contre-intuitif",
  "histoire",
  "direct",
  "peur",
];

export class HookEngine {
  constructor(private readonly provider: ChatProvider = deepSeek) {}

  async generateHooks(request: HookRequest): Promise<HookOption[]> {
    const count = Math.min(Math.max(request.count ?? 5, 3), 8);

    const userPrompt = `SUJET : ${request.topic}

ANGLE CHOISI :
- Titre : ${request.angle.title}
- Type : ${request.angle.angleType}
- Résumé : ${request.angle.summary}
- Besoin cible : ${request.angle.audienceNeed}
- Piste d'accroche : ${request.angle.hookDirection}

Travail demandé :
Propose ${count} hooks parlés (à dire à l'oral en ouverture de vidéo), chacun avec un mécanisme différent. Règles :
- maximum 10 mots chacun ;
- aucune promesse mensongère, aucun clicbait interdit par les plateformes ;
- ton naturel, oral, punchy, jamais corporate ;
- adapté à une vidéo verticale courte qui doit stopper le scroll.

Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "hooks": [
    {
      "text": "hook parlé",
      "style": "question | statistique | contre-intuitif | histoire | direct | peur",
      "trigger": "émotion ou mécanisme déclenché"
    }
  ]
}`;

    const result = await chatJson<{ hooks?: HookOption[] }>(
      this.provider,
      [
        {
          role: "system",
          content:
            "Tu es un expert des hooks pour vidéos courtes (TikTok/Shorts/Reels). Tu écris des ouvertures orales qui créent un manque d'information immédiat. Format oral, jamais écrit.",
        },
        { role: "user", content: userPrompt },
      ],
      "HookOptions",
      { temperature: 0.8 },
    );

    return (result?.hooks ?? [])
      .filter(
        (hook): hook is HookOption =>
          Boolean(
            hook &&
              typeof hook.text === "string" &&
              hook.text.trim().length > 0,
          ),
      )
      .map((hook) => ({
        text: hook.text.trim(),
        style: HOOK_STYLES.includes(hook.style as HookStyle)
          ? (hook.style as HookStyle)
          : "direct",
        trigger:
          typeof hook.trigger === "string" ? hook.trigger.trim() : "",
      }))
      .slice(0, count);
  }
}

