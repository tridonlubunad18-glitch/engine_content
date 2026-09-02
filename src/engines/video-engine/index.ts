/**
 * VIDEO ENGINE — PRD §3.8 (Video Engine → Render Engine → FFmpeg) et §13.
 * Phase 5.
 *
 * Montage vertical (9:16) simple mais réel : pour chaque scène → segment
 * encodé (asset vidéo ou image, recadré 1080×1920, texte à l'écran en bas),
 * concaténation, puis mixage audio (voix off Phase 3 + musique optionnelle).
 * Sortie MP4 H.264.
 *
 * Le rendu lourd s'exécute en local ; un worker Vercel/R2 interviendra
 * plus tard si nécessaire (PRD §3.8). L'export est écrit dans
 * `output/video/` (ignoré par git).
 */

import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { createLogger } from "@/lib/logger";

const logger = createLogger("engine:video");

export interface RenderSceneInput {
  durationSec: number;
  /** Chemin absolu ou relatif de l'asset (vidéo ou image). */
  sourcePath: string;
  sourceKind: "video" | "image";
  /** Texte fort affiché en bas d'écran (optionnel). */
  onScreenText?: string;
}

export interface RenderInput {
  /** Libellé pour le nom du fichier final. */
  title?: string;
  scenes: RenderSceneInput[];
  /** Voix off MP3 (Phase 3), optionnelle à ce stade. */
  voicePath?: string | null;
  /** Musique de fond (asset `music/`), optionnelle. */
  musicPath?: string | null;
  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderResult {
  filePath: string;
  durationSec: number;
  segmentsEncoded: number;
  logPath: string;
  /** Durée réelle mesurée (ffprobe) si disponible. */
  actualDurationSec: number | null;
}

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/DejaVuSans.ttf",
];

function findFontFile(): string | null {
  return FONT_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
}

/** Échappe un chemin pour l'utiliser dans un filtre drawtext. */
function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "");
}

function slugify(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || "video";
}

export class VideoEngine {
  constructor(
    private readonly ffmpegPath: string = process.env.FFMPEG_PATH ?? "ffmpeg",
    private readonly ffprobePath: string =
      process.env.FFPROBE_PATH ?? "ffprobe",
  ) {}

  /**
   * Monte la vidéo : segments par scène → concaténation → audio
   * (voix off + musique) → export MP4 vertical dans output/video/.
   */
  async render(input: RenderInput): Promise<RenderResult> {
    const scenes = input.scenes;
    if (!scenes || scenes.length === 0) {
      throw new Error("Aucune scène à monter.");
    }
    for (const scene of scenes) {
      if (scene.durationSec <= 0) {
        throw new Error("Durée de scène invalide (<= 0).");
      }
      if (!existsSync(scene.sourcePath)) {
        throw new Error(
          `Asset introuvable pour le montage : ${scene.sourcePath} (statut BLOCKED, PRD §9).`,
        );
      }
    }
    if (input.voicePath && !existsSync(input.voicePath)) {
      throw new Error(`Voix off introuvable : ${input.voicePath}.`);
    }
    if (input.musicPath && !existsSync(input.musicPath)) {
      throw new Error(`Musique introuvable : ${input.musicPath}.`);
    }

    const width = input.width ?? 1080;
    const height = input.height ?? 1920;
    const fps = input.fps ?? 30;
    const totalDuration = scenes.reduce(
      (sum, scene) => sum + scene.durationSec,
      0,
    );
    const fontFile = findFontFile();

    const outDir = path.resolve(process.cwd(), "output", "video");
    const tmpDir = path.join(outDir, `tmp-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    const logPath = path.join(tmpDir, "ffmpeg.log");

    try {
      // 1) Encodage d'un segment par scène (9:16, texte en bas si fourni).
      const segmentPaths: string[] = [];
      for (let index = 0; index < scenes.length; index += 1) {
        const scene = scenes[index];
        const segmentPath = path.join(tmpDir, `seg-${index}.mp4`);
        const args: string[] = ["-y"];

        if (scene.sourceKind === "image") {
          args.push("-loop", "1");
        }
        args.push("-i", scene.sourcePath);
        if (scene.sourceKind === "video") {
          args.push("-ss", "0");
        }
        args.push("-t", String(scene.durationSec), "-an");

        let vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p`;

        if (scene.onScreenText && fontFile) {
          const textFilePath = path.join(tmpDir, `text-${index}.txt`);
          await fs.writeFile(
            textFilePath,
            scene.onScreenText.toUpperCase(),
            "utf8",
          );
          const drawtext = `drawtext=fontfile='${escapeFilterPath(fontFile)}':textfile='${escapeFilterPath(textFilePath)}':x=(w-text_w)/2:y=h-text_h-160:fontsize=64:fontcolor=white:borderw=5:bordercolor=black@0.85`;
          vf = `${vf},${drawtext}`;
        }

        args.push("-vf", vf);
        args.push(
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
        );
        args.push(segmentPath);

        await this.runProcess(this.ffmpegPath, args, logPath);
        segmentPaths.push(segmentPath);
      }

      // 2) Concaténation des segments.
      const concatList = path.join(tmpDir, "concat.txt");
      const listContent = segmentPaths
        .map((segment) => `file '${segment.replace(/\\/g, "/")}'`)
        .join("\n");
      await fs.writeFile(concatList, `${listContent}\n`, "utf8");

      const concatPath = path.join(tmpDir, "video-silencieux.mp4");
      await this.runProcess(
        this.ffmpegPath,
        ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", concatPath],
        logPath,
      );

      // 3) Mixage audio (voix off + musique) puis export final.
      const finalTmpPath = await this.mixAudioAndExport(input, {
        concatPath,
        tmpDir,
        totalDuration,
        logPath,
      });

      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const finalPath = path.join(
        outDir,
        `${slugify(input.title ?? "video")}-${stamp}.mp4`,
      );
      await fs.copyFile(finalTmpPath, finalPath);

      // Le log FFmpeg est conservé dans output/video/ (le tmp est supprimé).
      const persistedLogPath = path.join(
        outDir,
        `ffmpeg-${slugify(input.title ?? "video")}-${stamp}.log`,
      );
      await fs.copyFile(logPath, persistedLogPath).catch(() => undefined);

      const actualDurationSec = await this.readDuration(finalPath);

      logger.info("Vidéo exportée", {
        filePath: finalPath,
        segmentsEncoded: scenes.length,
        durationSec: totalDuration,
        actualDurationSec,
      });

      return {
        filePath: finalPath,
        durationSec: totalDuration,
        segmentsEncoded: scenes.length,
        logPath: persistedLogPath,
        actualDurationSec,
      };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** Ajoute la piste audio (voix off + musique optionnelle) et exporte. */
  private async mixAudioAndExport(
    input: RenderInput,
    context: {
      concatPath: string;
      tmpDir: string;
      totalDuration: number;
      logPath: string;
    },
  ): Promise<string> {
    const { concatPath, tmpDir, totalDuration, logPath } = context;
    const hasVoice = Boolean(input.voicePath);
    const hasMusic = Boolean(input.musicPath);
    const finalPath = path.join(tmpDir, "final.mp4");

    if (!hasVoice && !hasMusic) {
      await fs.copyFile(concatPath, finalPath);
      return finalPath;
    }

    const args = ["-y", "-i", concatPath];
    const voiceIndex = 1;
    if (hasVoice) args.push("-i", input.voicePath as string);
    const musicIndex = hasVoice ? 2 : 1;
    if (hasMusic) args.push("-i", input.musicPath as string);

    const filters: string[] = [];
    if (hasVoice) {
      filters.push(`[${voiceIndex}:a]volume=1.0,apad[vo]`);
    }
    if (hasMusic) {
      const fadeStart = Math.max(0, totalDuration - 2);
      filters.push(
        `[${musicIndex}:a]volume=0.12,afade=t=out:st=${fadeStart}:d=2[mu]`,
      );
    }

    let audioOutput: string;
    if (hasVoice && hasMusic) {
      filters.push("[vo][mu]amix=inputs=2:duration=first:normalize=0[aout]");
      audioOutput = "[aout]";
    } else if (hasVoice) {
      filters.push("[vo]anull[aout]");
      audioOutput = "[aout]";
    } else {
      filters.push(
        `[${musicIndex}:a]atrim=0:${totalDuration},volume=0.12[aout]`,
      );
      audioOutput = "[aout]";
    }

    args.push("-filter_complex", filters.join(";"));
    args.push(
      "-map",
      "0:v",
      "-map",
      audioOutput,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(totalDuration),
      finalPath,
    );

    await this.runProcess(this.ffmpegPath, args, logPath);
    return finalPath;
  }

  /** Exécute ffmpeg/ffprobe et journalise la sortie (append) dans logPath. */
  private runProcess(
    binary: string,
    args: string[],
    logPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        void fs
          .appendFile(logPath, `\n$ ${binary} ${args.join(" ")}\n${output}`, "utf8")
          .catch(() => undefined);
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `${path.basename(binary)} a échoué (code ${code}) — voir ${logPath}`,
            ),
          );
        }
      });
    });
  }

  /** Mesure la durée réelle du fichier (ffprobe), null si indisponible. */
  private async readDuration(filePath: string): Promise<number | null> {
    return new Promise((resolve) => {
      const child = spawn(
        this.ffprobePath,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
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
        const duration = Number.parseFloat(output.trim());
        resolve(Number.isFinite(duration) ? duration : null);
      });
    });
  }
}

/** Instance partagée. */
export const videoEngine = new VideoEngine();



