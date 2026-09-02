/**
 * ELEVENLABS PROVIDER — PRD §3.7 (Voice Provider → ElevenLabs). Phase 3.
 *
 * Génération de voix off. Provider isolé et remplaçable (le Voice Engine
 * ne dépend pas directement d'ElevenLabs).
 *
 * MULTI-COMPTES (décision utilisateur) : plusieurs comptes gratuits
 * ~10 000 crédits/mois chacun. Trois formats de configuration acceptés :
 *   1. `ELEVENLABS_API_KEY_01`, `_02`, `_03`… (une variable par compte) ;
 *   2. `ELEVENLABS_API_KEYS="sk_1,sk_2,…"` (liste) ;
 *   3. `ELEVENLABS_API_KEY` (une seule clé).
 * Le provider essaie chaque clé dans l'ordre et bascule automatiquement
 * quand le quota d'un compte est épuisé (HTTP 401/402/429 ou message
 * « quota »/« credit »). Les logs ne contiennent JAMAIS les clés.
 *
 * ⚠️ Server-only : les clés ne doivent jamais fuiter vers le frontend.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("provider:elevenlabs");

export const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

export interface ElevenLabsSynthesisInput {
  /** Texte à lire à l'oral (voix off). */
  text: string;
  voiceId?: string;
  modelId?: string;
  /** Timeout d'une tentative en ms (défaut 120 s). */
  timeoutMs?: number;
}

export interface ElevenLabsSynthesisResult {
  /** Audio MP3 brut. */
  audio: Buffer;
  contentType: string;
  voiceId: string;
  voiceName: string;
  modelId: string;
  /** Index (1-based) de la clé utilisée — jamais la clé elle-même. */
  usedKeyIndex: number;
}

export class ElevenLabsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ElevenLabsError";
  }
}

/** Lit toutes les clés configurées (formats 1, 2 et 3), sans doublons. */
export function readElevenLabsApiKeys(): string[] {
  const keys: string[] = [];

  // Format 1 : ELEVENLABS_API_KEY_01, _02, _03…
  for (let index = 1; index <= 50; index += 1) {
    const padded = String(index).padStart(2, "0");
    const value = process.env[`ELEVENLABS_API_KEY_${padded}`]?.trim();
    if (!value) break;
    keys.push(value);
  }

  // Format 2 : ELEVENLABS_API_KEYS="k1,k2,…"
  const list = process.env.ELEVENLABS_API_KEYS?.trim();
  if (list) {
    for (const key of list.split(",")) {
      const trimmed = key.trim();
      if (trimmed) keys.push(trimmed);
    }
  }

  // Format 3 : ELEVENLABS_API_KEY (une seule clé)
  const single = process.env.ELEVENLABS_API_KEY?.trim();
  if (single) keys.push(single);

  return [...new Set(keys)];
}

export function hasElevenLabsKeys(): boolean {
  return readElevenLabsApiKeys().length > 0;
}

/** Identifiant de voix de secours (historiquement « Rachel »). */
const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

interface VoiceSummary {
  voiceId: string;
  name: string;
}

function isQuotaLikeError(status: number, bodyText: string): boolean {
  return (
    status === 401 ||
    status === 402 ||
    status === 429 ||
    /quota|credit|billing/i.test(bodyText)
  );
}

export class ElevenLabsProvider {
  /** Voix résolue par compte (la clé ne sert que d'index interne, jamais loggée). */
  private readonly voiceCache = new Map<string, VoiceSummary>();

  /** Compte ayant réussi la dernière synthèse (mémoire intra-processus). */
  private preferredKeyIndex: number | null = null;

  /** Ordre de tentative : compte préféré d'abord, puis les autres. */
  private buildAttemptOrder(count: number): number[] {
    const preferred = this.preferredKeyIndex;
    if (preferred !== null && preferred >= 0 && preferred < count) {
      const order = [preferred];
      for (let i = 0; i < count; i += 1) {
        if (i !== preferred) order.push(i);
      }
      return order;
    }
    return Array.from({ length: count }, (_, index) => index);
  }

  private async resolveDefaultVoice(apiKey: string): Promise<VoiceSummary> {
    const cached = this.voiceCache.get(apiKey);
    if (cached) return cached;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices`, {
        headers: { "xi-api-key": apiKey },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        if (isQuotaLikeError(response.status, bodyText)) {
          logger.warn("ElevenLabs : liste des voix refusée (quota/clé)", {
            status: response.status,
          });
          return { voiceId: FALLBACK_VOICE_ID, name: "secours" };
        }
        throw new ElevenLabsError(
          `ElevenLabs voices HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        voices?: Array<{ voice_id?: string; name?: string }>;
      };
      const first = data.voices?.find((voice) => voice.voice_id);
      const resolved: VoiceSummary = first?.voice_id
        ? { voiceId: first.voice_id, name: first.name ?? "" }
        : { voiceId: FALLBACK_VOICE_ID, name: "secours" };

      this.voiceCache.set(apiKey, resolved);
      logger.info("Voix par défaut sélectionnée", {
        voiceId: resolved.voiceId,
        voiceName: resolved.name,
      });
      return resolved;
    } catch (error) {
      logger.warn("ElevenLabs : impossible de lister les voix — secours", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { voiceId: FALLBACK_VOICE_ID, name: "secours" };
    }
  }

  /**
   * Synthétise la voix off d'un texte. Essaie chaque compte configuré
   * (rotation automatique sur quota/401/402/429).
   */
  async synthesize(
    input: ElevenLabsSynthesisInput,
  ): Promise<ElevenLabsSynthesisResult> {
    const text = input.text.trim();
    if (!text) {
      throw new ElevenLabsError("Texte vide — rien à synthétiser.");
    }

    const keys = readElevenLabsApiKeys();
    if (keys.length === 0) {
      throw new ElevenLabsError(
        "Aucune clé ElevenLabs configurée (ELEVENLABS_API_KEY_01… / ELEVENLABS_API_KEYS / ELEVENLABS_API_KEY). Voir .env.local.",
      );
    }

    const timeoutMs = input.timeoutMs ?? 120_000;
    const modelId =
      input.modelId?.trim() || process.env.ELEVENLABS_MODEL?.trim() || "";
    let lastError: unknown;

    const attemptOrder = this.buildAttemptOrder(keys.length);
    for (const position of attemptOrder) {
      const keyIndex = position + 1;
      const apiKey = keys[position];

      const voice =
        input.voiceId?.trim() !== undefined && input.voiceId.trim() !== ""
          ? { voiceId: input.voiceId.trim(), name: "configurée" }
          : await this.resolveDefaultVoice(apiKey);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      try {
        const response = await fetch(
          `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify(
              modelId ? { text, model_id: modelId } : { text },
            ),
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          if (isQuotaLikeError(response.status, bodyText)) {
            lastError = new ElevenLabsError(
              `Quota ou clé invalide (HTTP ${response.status}) sur la clé #${keyIndex}.`,
            );
            logger.warn(
              "ElevenLabs : compte saturé/invalide — bascule sur la clé suivante",
              { keyIndex, status: response.status },
            );
            continue;
          }
          throw new ElevenLabsError(
            `ElevenLabs HTTP ${response.status}${
              bodyText ? ` : ${bodyText.slice(0, 200)}` : ""
            }`,
          );
        }

        const contentType =
          response.headers.get("content-type") ?? "audio/mpeg";
        const audio = Buffer.from(await response.arrayBuffer());
        if (audio.length === 0) {
          throw new ElevenLabsError("Réponse audio vide.");
        }

        this.preferredKeyIndex = position;
        logger.info("ElevenLabs : voix générée", {
          keyIndex,
          voiceId: voice.voiceId,
          voiceName: voice.name,
          bytes: audio.length,
          durationMs: Date.now() - startedAt,
        });

        return {
          audio,
          contentType,
          voiceId: voice.voiceId,
          voiceName: voice.name,
          modelId: modelId || "default",
          usedKeyIndex: keyIndex,
        };
      } catch (error) {
        if (error instanceof ElevenLabsError) {
          throw error; // erreur métier non liée au quota → on remonte
        }
        const isTimeout = error instanceof Error && error.name === "AbortError";
        lastError = isTimeout
          ? new ElevenLabsError(
              `ElevenLabs : timeout après ${timeoutMs} ms (clé #${keyIndex}).`,
            )
          : error;
        logger.warn("ElevenLabs : échec réseau/tentative", {
          keyIndex,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearTimeout(timer);
      }
    }

    // Aucun compte n'a fonctionné : on oublie la préférence pour le prochain appel.
    this.preferredKeyIndex = null;
    throw new ElevenLabsError(
      `Toutes les clés ElevenLabs sont épuisées ou invalides (${keys.length} compte(s) essayé(s)).`,
      { cause: lastError },
    );
  }
}

/** Instance partagée. */
export const elevenLabs = new ElevenLabsProvider();


