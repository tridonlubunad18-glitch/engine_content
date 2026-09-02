/**
 * DEEPSEEK PROVIDER — PRD §3.6.
 * IA principale du Content Engine : analyse marketing, stratégie, angles,
 * hooks, scripts, variantes, analyse des performances, apprentissage,
 * rapports et conversation WhatsApp.
 *
 * Phase 1 — implémentation du client.
 *
 * Principe (PRD §3.6) : ne jamais appeler DeepSeek quand une logique
 * déterministe suffit (calculs, tris, statistiques, statuts → code).
 *
 * Gestion des erreurs (PRD §35) : timeout par tentative, retries avec
 * backoff, logs, erreurs typées.
 *
 * ⚠️ Server-only : la clef DEEPSEEK_API_KEY ne doit jamais fuiter.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("provider:deepseek");

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export type DeepSeekRole = "system" | "user" | "assistant";

export interface DeepSeekMessage {
  role: DeepSeekRole;
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Nombre maximal de nouvelles tentatives après un échec réessayable (défaut 2). */
  retries?: number;
  /** Timeout d'une tentative, en ms (défaut 90 s). */
  timeoutMs?: number;
  /**
   * Désactive la phase de « raisonnement » du modèle quand celui-ci le
   * permet (deepseek-v4-flash). Défaut : true — plus rapide, moins cher,
   * contenu direct. Repli automatique sans le paramètre si refus HTTP 400.
   */
  disableThinking?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class DeepSeekError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DeepSeekError";
  }
}

function readApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new DeepSeekError(
      "Variable DEEPSEEK_API_KEY manquante (voir .env.local / .env.example).",
    );
  }
  return key;
}

function readDefaultModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tente d'extraire un objet JSON depuis une réponse texte d'IA.
 * Accepte les réponses « propres » comme les réponses entourées de
 * blocs de code markdown (```json … ```) ou précédées de texte.
 */
export function parseModelJson<T>(content: string, label: string): T {
  const trimmed = content.trim();

  // 1. Retrait des blocs de code markdown éventuels.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : trimmed).trim();

  // 2. Extraction du premier objet {...} si du texte parasite subsiste.
  const jsonCandidate = candidate.startsWith("{")
    ? candidate
    : (candidate.match(/\{[\s\S]*\}/)?.[0] ?? candidate);

  try {
    return JSON.parse(jsonCandidate) as T;
  } catch (error) {
    throw new DeepSeekError(
      `Impossible de parser le JSON de « ${label} » : ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Client DeepSeek minimal et isolé (PRD §4 : chaque provider externe
 * est isolé et remplaçable).
 */
export class DeepSeekProvider {
  /**
   * Envoie une conversation complète (messages) à DeepSeek.
   * Réessaie automatiquement les erreurs réseau, timeouts, 429 et 5xx.
   */
  async chatCompletion(
    messages: DeepSeekMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    const model = options.model ?? readDefaultModel();
    const apiKey = readApiKey();
    const maxRetries = options.retries ?? 2;
    const timeoutMs = options.timeoutMs ?? 90_000;
    let disableThinking = options.disableThinking ?? true;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (attempt > 0) {
        const backoffMs = 1_000 * 2 ** (attempt - 1);
        logger.warn("DeepSeek : nouvelle tentative", { attempt, backoffMs });
        await sleep(backoffMs);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      try {
        const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            stream: false,
            ...(disableThinking ? { thinking: { type: "disabled" } } : {}),
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          const detail = bodyText.slice(0, 300);

          // Repli : si le modèle refuse le paramètre « thinking » (HTTP 400),
          // on relance une tentative sans ce paramètre.
          if (
            response.status === 400 &&
            disableThinking &&
            bodyText.toLowerCase().includes("thinking")
          ) {
            logger.warn(
              "DeepSeek : paramètre thinking refusé — nouvel essai sans paramètre",
              { attempt, detail },
            );
            disableThinking = false;
            lastError = null;
            continue;
          }

          lastError = new DeepSeekError(
            `DeepSeek HTTP ${response.status}${detail ? ` : ${detail}` : ""}`,
          );
          const retriable = response.status === 429 || response.status >= 500;
          if (!retriable) {
            throw lastError;
          }
          logger.warn("DeepSeek : échec temporaire", {
            status: response.status,
            attempt,
            durationMs,
          });
          continue;
        }

        const data = (await response.json()) as {
          choices?: Array<{
            message?: { content?: string };
            finish_reason?: string;
          }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          };
        };

        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        if (!content) {
          const firstChoice = data.choices?.[0];
          logger.error("DeepSeek : réponse vide", {
            model,
            finishReason: firstChoice?.finish_reason,
            messageKeys: Object.keys(firstChoice?.message ?? {}),
            completionTokens: data.usage?.completion_tokens ?? 0,
            durationMs: Date.now() - startedAt,
          });
          throw new DeepSeekError("Réponse DeepSeek vide ou illisible.");
        }

        logger.info("DeepSeek : appel réussi", {
          model,
          durationMs,
          usage: {
            prompt: data.usage?.prompt_tokens ?? 0,
            completion: data.usage?.completion_tokens ?? 0,
            total: data.usage?.total_tokens ?? 0,
          },
        });

        return {
          content,
          model,
          usage: {
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
            totalTokens: data.usage?.total_tokens ?? 0,
          },
        };
      } catch (error) {
        // Les erreurs non réessayables (4xx, JSON illisible…) remontent.
        if (error instanceof DeepSeekError) {
          throw error;
        }
        const isTimeout = error instanceof Error && error.name === "AbortError";
        lastError = isTimeout
          ? new DeepSeekError(`DeepSeek : timeout après ${timeoutMs} ms.`)
          : error;
        logger.warn("DeepSeek : échec d'appel", {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearTimeout(timer);
      }
    }

    throw new DeepSeekError(
      `DeepSeek : échec après ${maxRetries + 1} tentative(s).`,
      { cause: lastError },
    );
  }
}

/** Instance partagée (le provider est sans état). */
export const deepSeek = new DeepSeekProvider();


