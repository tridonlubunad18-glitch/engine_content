/**
 * WHATSAPP BRAIN — Phase 8 (PRD §3.6 conversation WhatsApp, §24/§25).
 *
 * Lorsque l'utilisateur écrit en langage naturel, son message est envoyé
 * à DeepSeek pour analyser / ajuster la stratégie marketing Goal-IA et
 * produire une réponse actionnable. Commandes simples gérées avant (voir
 * whatsapp-connect). Provider isolé (deepseek).
 */

import { deepSeek } from "@/providers/deepseek";
import {
  DEFAULT_AUDIENCE,
  DEFAULT_BRAND_CONTEXT,
  DEFAULT_GOAL,
} from "@/lib/brand";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib:whatsapp-brain");

const FALLBACK =
  "🤖 Je n'ai pas pu analyser votre message (erreur IA). Réessayez dans un instant.";

export async function answerWithBrain(userText: string): Promise<string> {
  const text = userText.trim().slice(0, 1200);
  if (!text) return FALLBACK;

  try {
    const result = await deepSeek.chatCompletion(
      [
        {
          role: "system",
          content: `Tu es l'assistant stratégique de Goal-IA (Content Engine). Rôle : aider le fondateur à ajuster la stratégie marketing à partir de ses messages naturels (idées, questions, retours, décisions).

Contexte de la marque :
${DEFAULT_BRAND_CONTEXT}

Cible : ${DEFAULT_AUDIENCE}
Objectif : ${DEFAULT_GOAL}

Réponds en français, concis et actionnable (200 mots max). Si l'utilisateur propose une idée : évalue-la, suggère un angle de contenu et une prochaine action. Si c'est une question : réponds clairement. Ne promets jamais de résultats garantis.`,
        },
        { role: "user", content: text },
      ],
      { temperature: 0.6, maxTokens: 600 },
    );

    const reply = result.content.trim().slice(0, 1600);
    return reply || FALLBACK;
  } catch (error) {
    logger.error("whatsapp-brain : appel DeepSeek échoué", {
      error: error instanceof Error ? error.message : String(error),
    });
    return FALLBACK;
  }
}
