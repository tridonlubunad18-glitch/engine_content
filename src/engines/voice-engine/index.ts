/**
 * VOICE ENGINE — PRD §3.7 (Voice Engine → Voice Provider → ElevenLabs).
 * Phase 3.
 *
 * Génère la voix off d'un texte (ex. voiceoverText d'un script Phase 1)
 * via le provider ElevenLabs, puis écrit le fichier MP3 en local
 * (`output/voice/`, ignoré par git). Le branchement Cloudflare R2 se fera
 * en Phase 6 (PRD §37) — le provider est déjà isolé et remplaçable.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createLogger } from "@/lib/logger";
import { elevenLabs } from "@/providers/elevenlabs";

const logger = createLogger("engine:voice");

/** Débit oral moyen utilisé pour estimer la durée de la voix. */
export const VOICE_WORDS_PER_MINUTE = 150;

export interface VoiceoverRequest {
  /** Texte à lire à l'oral (voix off). */
  text: string;
  voiceId?: string;
  modelId?: string;
  /** Libellé court pour nommer le fichier (sinon dérivé du texte). */
  label?: string;
}

export interface VoiceoverResult {
  /** Chemin absolu du fichier MP3 généré. */
  filePath: string;
  /** Chemin relatif (output/voice/…). */
  relativePath: string;
  sizeBytes: number;
  voiceId: string;
  voiceName: string;
  modelId: string;
  /** Index (1-based) du compte ElevenLabs utilisé. */
  usedKeyIndex: number;
  /** Durée estimée (heuristique mots/min — QC exact en Phase 5/7). */
  estimatedDurationSec: number;
}

function countWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.length > 1 || (words.length === 1 && words[0].length > 0)
    ? words.length
    : 0;
}

function slugify(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || "voix";
}

export class VoiceEngine {
  /**
   * Génère la voix off du texte et l'écrit dans output/voice/.
   * Le provider ElevenLabs bascule automatiquement de compte si le
   * quota du premier est épuisé.
   */
  async generateVoiceover(
    request: VoiceoverRequest,
  ): Promise<VoiceoverResult> {
    const text = request.text.trim();
    if (!text) {
      throw new Error("Texte vide — aucune voix à générer.");
    }

    const synth = await elevenLabs.synthesize({
      text,
      voiceId: request.voiceId,
      modelId: request.modelId,
    });

    const dir = path.resolve(process.cwd(), "output", "voice");
    await fs.mkdir(dir, { recursive: true });

    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const fileName = `${slugify(request.label ?? text)}-${stamp}.mp3`;
    const filePath = path.join(dir, fileName);
    const relativePath = path.posix.join("output", "voice", fileName);

    await fs.writeFile(filePath, synth.audio);

    const estimatedDurationSec = Math.max(
      1,
      Math.round((countWords(text) / VOICE_WORDS_PER_MINUTE) * 60),
    );

    logger.info("Voix off générée et écrite", {
      filePath,
      sizeBytes: synth.audio.length,
      estimatedDurationSec,
    });

    return {
      filePath,
      relativePath,
      sizeBytes: synth.audio.length,
      voiceId: synth.voiceId,
      voiceName: synth.voiceName,
      modelId: synth.modelId,
      usedKeyIndex: synth.usedKeyIndex,
      estimatedDurationSec,
    };
  }
}

/** Instance partagée. */
export const voiceEngine = new VoiceEngine();

