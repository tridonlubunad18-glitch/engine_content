/**
 * IA — helpers partagés des engines (Phase 1, PRD §3.6).
 *
 * Fournit :
 * - `ChatProvider` : interface structurale minimale pour qu'un engine
 *   puisse travailler avec n'importe quel fournisseur d'IA (remplaçable) ;
 * - `chatText` : appel simple retournant le texte ;
 * - `chatJson` : appel + parse JSON strict, avec une tentative de
 *   correction automatique si le modèle renvoie du JSON invalide.
 */

import {
  parseModelJson,
  type ChatCompletionOptions,
  type ChatCompletionResult,
  type DeepSeekMessage,
} from "@/providers/deepseek";

export { parseModelJson };

export interface ChatProvider {
  chatCompletion(
    messages: DeepSeekMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult>;
}

export async function chatText(
  provider: ChatProvider,
  messages: DeepSeekMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const result = await provider.chatCompletion(messages, options);
  return result.content;
}

/**
 * Appelle le provider puis tente de parser la réponse comme JSON.
 * En cas d'échec de parse, une seconde tentative est envoyée avec la
 * consigne de répondre uniquement en JSON valide.
 */
export async function chatJson<T>(
  provider: ChatProvider,
  messages: DeepSeekMessage[],
  label: string,
  options?: ChatCompletionOptions,
): Promise<T> {
  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const finalMessages: DeepSeekMessage[] =
      attempt === 0
        ? messages
        : [
            ...messages,
            { role: "assistant", content: lastRaw },
            {
              role: "user",
              content:
                "Le contenu précédent n'est pas un JSON valide. Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ni après, conforme exactement à la structure demandée.",
            },
          ];
    const result = await provider.chatCompletion(finalMessages, options);
    try {
      return parseModelJson<T>(result.content, label);
    } catch (error) {
      lastRaw = result.content;
      if (attempt === 1) {
        throw error;
      }
    }
  }
  throw new Error(`chatJson : état inatteignable pour « ${label} ».`);
}
