/**
 * QUALITY ENGINE — PRD §17 (Contrôle qualité) et §37 Phase 7.
 *
 * Contrôle AUTOMATIQUE d'une vidéo exportée (MP4) à l'aide de FFprobe :
 * - vertical 9:16 (PRD §7) ;
 * - durée 30-60 s (PRD §7/§17) ;
 * - piste audio présente (voix off) ;
 * - taille de fichier cohérente ;
 * - ratio d'aspect plausible.
 *
 * → Score qualité /100, verdict PASS / WARN / FAIL (PRD §17 :
 *   RENDER → QC → FAIL → CORRECTION → QC → PASS).
 *
 * 100 % déterministe (PRD §3.6) : aucune IA pour les mesures.
 */

import { spawn } from "node:child_process";
import { createLogger } from "@/lib/logger";

const logger = createLogger("engine:quality");

export interface QualityCheck {
  id: string;
  label: string;
  ok: boolean;
  weight: number;
  detail: string;
}

export type QualityVerdict = "PASS" | "WARN" | "FAIL";

export interface QualityReport {
  filePath: string;
  checks: QualityCheck[];
  score: number;
  verdict: QualityVerdict;
  /** Suggestions si le QC échoue (phase CORRECTION). */
  suggestions: string[];
}

interface FfprobeResult {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  sizeBytes: number;
}

/** Durées acceptables (PRD : 30-60 s). */
const MIN_DURATION_SEC = 30;
const MAX_DURATION_SEC = 60;
/** Ratio largeur/hauteur attendu pour du 9:16 (0,5625) avec marge. */
const MIN_RATIO = 0.5;
const MAX_RATIO = 0.65;
const MIN_SIZE_BYTES = 500 * 1024;
const MAX_SIZE_BYTES = 200 * 1024 * 1024;
const PASS_THRESHOLD = 85;
const WARN_THRESHOLD = 60;

export class QualityEngine {
  constructor(
    private readonly ffprobePath: string =
      process.env.FFPROBE_PATH ?? "ffprobe",
  ) {}

  /** Contrôle qualité d'une vidéo exportée (score /100 + verdict PRD §17). */
  async inspect(filePath: string): Promise<QualityReport> {
    const probe = await this.probe(filePath);
    if (!probe) {
      throw new Error(
        `Impossible de sonder la vidéo avec ffprobe : ${filePath}`,
      );
    }

    const ratio =
      probe.width > 0 && probe.height > 0
        ? probe.width / probe.height
        : 0;

    const checks: QualityCheck[] = [
      {
        id: "vertical",
        label: "Format vertical (hauteur > largeur)",
        ok: probe.height > 0 && probe.height > probe.width,
        weight: 30,
        detail: `${probe.width}×${probe.height}`,
      },
      {
        id: "ratio",
        label: `Ratio 9:16 (entre ${MIN_RATIO} et ${MAX_RATIO})`,
        ok: ratio >= MIN_RATIO && ratio <= MAX_RATIO,
        weight: 15,
        detail: ratio > 0 ? ratio.toFixed(3) : "inconnu",
      },
      {
        id: "duration",
        label: `Durée ${MIN_DURATION_SEC}-${MAX_DURATION_SEC} s`,
        ok:
          probe.durationSec >= MIN_DURATION_SEC &&
          probe.durationSec <= MAX_DURATION_SEC,
        weight: 25,
        detail: `${probe.durationSec.toFixed(1)} s`,
      },
      {
        id: "audio",
        label: "Piste audio présente (voix off)",
        ok: probe.hasAudio,
        weight: 20,
        detail: probe.hasAudio ? "présente" : "ABSENTE",
      },
      {
        id: "size",
        label: "Taille de fichier cohérente",
        ok:
          probe.sizeBytes >= MIN_SIZE_BYTES &&
          probe.sizeBytes <= MAX_SIZE_BYTES,
        weight: 10,
        detail: `${(probe.sizeBytes / 1024 / 1024).toFixed(1)} Mo`,
      },
    ];

    const score = checks.reduce(
      (sum, check) => sum + (check.ok ? check.weight : 0),
      0,
    );
    const verdict: QualityVerdict =
      score >= PASS_THRESHOLD
        ? "PASS"
        : score >= WARN_THRESHOLD
          ? "WARN"
          : "FAIL";

    const failed = checks.filter((check) => !check.ok);
    const suggestions =
      verdict === "PASS"
        ? []
        : [
            ...failed.map(
              (check) =>
                `Corriger : ${check.label} (actuel : ${check.detail}).`,
            ),
            "Relancer le montage (Video Engine) puis le QC (PRD §17 : FAIL → CORRECTION → QC).",
          ];

    logger.info("Contrôle qualité terminé", {
      filePath,
      score,
      verdict,
      failedChecks: failed.map((check) => check.id),
    });

    return {
      filePath,
      checks,
      score,
      verdict,
      suggestions,
    };
  }

  /** Sonde la vidéo via ffprobe (durée, dimensions, audio, taille). */
  private probe(filePath: string): Promise<FfprobeResult | null> {
    return new Promise((resolve) => {
      const child = spawn(
        this.ffprobePath,
        [
          "-v",
          "error",
          "-print_format",
          "json",
          "-show_streams",
          "-show_format",
          filePath,
        ],
        { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.on("error", () => resolve(null));
      child.on("close", () => {
        try {
          const data = JSON.parse(output) as {
            streams?: Array<{
              codec_type?: string;
              width?: number;
              height?: number;
            }>;
            format?: { duration?: string; size?: string };
          };
          const videoStream = data.streams?.find(
            (stream) => stream.codec_type === "video",
          );
          const hasAudio = (data.streams ?? []).some(
            (stream) => stream.codec_type === "audio",
          );
          const duration = Number.parseFloat(
            data.format?.duration ?? "0",
          );
          const sizeBytes = Number.parseInt(data.format?.size ?? "0", 10);
          resolve({
            durationSec: Number.isFinite(duration) ? duration : 0,
            width: videoStream?.width ?? 0,
            height: videoStream?.height ?? 0,
            hasAudio,
            sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
          });
        } catch {
          resolve(null);
        }
      });
    });
  }
}

/** Instance partagée. */
export const qualityEngine = new QualityEngine();


