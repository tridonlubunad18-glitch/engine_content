/**
 * DÉMO PHASE 6 — Storage (Cloudflare R2 réel).
 *
 * Uploade la dernière voix off (Phase 3) et la dernière vidéo (Phase 5)
 * dans le bucket R2 configuré (R2_BUCKET_NAME), puis vérifie la présence
 * côté R2 (HeadObject) et consigne les métadonnées (manifest local).
 *
 * Lancement : npm run demo:storage
 * (nécessite les clés R2 dans .env.local)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { storageService } from "../src/lib/storage";

async function newest(directory: string, extension: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .filter((entry) => entry.name.toLowerCase().endsWith(extension))
      .map((entry) => path.join(directory, entry.name));
    files.sort((a, b) => b.localeCompare(a, "fr"));
    return files[0] ?? null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const voicePath = await newest(path.join(root, "output", "voice"), ".mp3");
  const videoPath = await newest(path.join(root, "output", "video"), ".mp4");
  if (!voicePath || !videoPath) {
    throw new Error(
      "Il faut une voix off (output/voice) et une vidéo (output/video) : lance d'abord npm run demo:voice puis demo:video.",
    );
  }

  const now = new Date();
  const folder = `content/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/CONTENT-DEMO-001`;

  console.log("☁️  PHASE 6 — Démo Storage (Cloudflare R2 réel)\n");
  console.log(`Bucket   : ${process.env.R2_BUCKET_NAME}`);
  console.log(`Voix     : ${voicePath}`);
  console.log(`Vidéo    : ${videoPath}`);

  // 1) Upload voix off
  const voice = await storageService.uploadFile(voicePath, {
    key: `${folder}/voice.mp3`,
    kind: "voice",
  });
  console.log(`\n✅ Voix uploadée : ${voice.key} (v${voice.version})`);

  // 2) Upload vidéo finale
  const video = await storageService.uploadFile(videoPath, {
    key: `${folder}/final.mp4`,
    kind: "video",
  });
  console.log(`✅ Vidéo uploadée : ${video.key} (v${video.version})`);

  // 3) Vérification côté R2 (HeadObject)
  for (const meta of [voice, video]) {
    const remote = await storageService.headRemote(meta.key);
    console.log(
      `\nVérification R2 — ${meta.key} : ${remote.exists ? "PRÉSENT" : "ABSENT"} (${(remote.sizeBytes / 1024).toFixed(1)} Ko côté R2)`,
    );
    if (!remote.exists) {
      throw new Error(`Objet absent sur R2 : ${meta.key}`);
    }
  }

  // 4) Métadonnées (manifest local)
  const records = await storageService.listAll();
  console.log(`\nMétadonnées (manifest local) : ${records.length} enregistrement(s)`);

  console.log("\n✅ Démo Phase 6 terminée — le stockage R2 fonctionne.");
}

main().catch((error) => {
  console.error(
    "❌ Démo échouée :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
