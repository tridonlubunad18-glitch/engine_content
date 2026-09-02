/**
 * DÉMO PHASE 5 — Video Engine (FFmpeg réel).
 *
 * Monte une vraie vidéo verticale MP4 (1080×1920) à partir de :
 * - 5 scènes issues d'un script problem-solution (assets réels P2/P4) ;
 * - la voix off MP3 la plus récente générée en Phase 3 ;
 * - une musique de fond (assets/music).
 *
 * Lancement : npm run demo:video
 * (nécessite FFmpeg installé et au moins une voix dans output/voice/)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { videoEngine, type RenderSceneInput } from "../src/engines/video-engine";

async function listSorted(dir: string, extension?: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .filter((entry) => !extension || entry.name.toLowerCase().endsWith(extension))
      .map((entry) => path.join(dir, entry.name));
    files.sort((a, b) => a.localeCompare(b, "fr"));
    return files;
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const broll = await listSorted(path.join(root, "assets", "broll"), ".mp4");
  if (broll.length < 2) {
    throw new Error("Il faut au moins 2 B-roll dans assets/broll/ pour la démo.");
  }
  const screenshotDir = path.join(root, "assets", "screenshots");
  const screenshots = await listSorted(screenshotDir, ".png");
  if (screenshots.length === 0) {
    throw new Error("Aucune capture d'écran dans assets/screenshots/.");
  }
  const goalIaDir = path.join(root, "assets", "goal-ia");
  const goalIa = await listSorted(goalIaDir, ".mp4");
  const appVideosDir = path.join(root, "assets", "app-videos");
  const appVideos = await listSorted(appVideosDir, ".mp4");
  if (goalIa.length === 0 || appVideos.length === 0) {
    throw new Error("Assets Goal-IA / app-videos manquants pour la démo.");
  }

  const voiceDir = path.join(root, "output", "voice");
  const voices = (await listSorted(voiceDir, ".mp3")).sort((a, b) =>
    b.localeCompare(a, "fr"),
  );
  if (voices.length === 0) {
    throw new Error(
      "Aucune voix off dans output/voice/ — lance d'abord npm run demo:voice.",
    );
  }
  const musicDir = path.join(root, "assets", "music");
  const music = await listSorted(musicDir, ".mp3");

  const scenes: RenderSceneInput[] = [
    {
      durationSec: 4,
      sourcePath: broll[0],
      sourceKind: "video",
      onScreenText: "TON COUPON VA TOMBER",
    },
    {
      durationSec: 8,
      sourcePath: broll[1],
      sourceKind: "video",
      onScreenText: "+1 MATCH = +1 RISQUE",
    },
    {
      durationSec: 10,
      sourcePath: screenshots[0],
      sourceKind: "image",
      onScreenText: "GOAL-IA SIMPLIFIE",
    },
    {
      durationSec: 8,
      sourcePath: appVideos[0],
      sourceKind: "video",
      onScreenText: "MOINS DE PARIS = PLUS DE CHANCES",
    },
    {
      durationSec: 5,
      sourcePath: goalIa[0],
      sourceKind: "video",
      onScreenText: "TELECHARGE GOAL-IA",
    },
  ];

  const total = scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  console.log("🎥 PHASE 5 — Démo Video Engine (FFmpeg réel)\n");
  console.log(`Scènes : ${scenes.length} (${total} s) 1080×1920 @30fps`);
  console.log(`Voix off : ${voices[0]}`);
  if (music.length > 0) console.log(`Musique  : ${music[0]} (volume bas)`);
  else console.log("Musique  : aucune trouvée (ignorée)");

  const result = await videoEngine.render({
    title: "demo-coupons",
    scenes,
    voicePath: voices[0],
    musicPath: music.length > 0 ? music[0] : null,
  });

  const stat = await fs.stat(result.filePath);
  console.log("\n✅ Vidéo exportée :");
  console.log(`   fichier          : ${result.filePath}`);
  console.log(`   taille           : ${(stat.size / 1024 / 1024).toFixed(1)} Mo`);
  console.log(`   durée calculée   : ${result.durationSec} s`);
  console.log(
    `   durée réelle      : ${result.actualDurationSec !== null ? result.actualDurationSec.toFixed(1) : "non mesurée (ffprobe absent)"} s`,
  );
  console.log(`   segments encodés : ${result.segmentsEncoded}`);
  console.log(`   log FFmpeg       : ${result.logPath}`);

  console.log("\n✅ Démo Phase 5 terminée — la vidéo est montée.");
}

main().catch((error) => {
  console.error(
    "❌ Démo échouée :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
