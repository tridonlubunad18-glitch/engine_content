/**
 * DÉMO PHASE 7 — Quality Engine (contrôle qualité réel, FFprobe).
 *
 * Contrôle la dernière vidéo exportée (output/video) : vertical, ratio,
 * durée 30-60 s, piste audio, taille → score /100 et verdict PASS/WARN/FAIL.
 *
 * Lancement : npm run demo:qc
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { qualityEngine } from "../src/engines/quality-engine";

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
  const videoPath = await newest(
    path.join(process.cwd(), "output", "video"),
    ".mp4",
  );
  if (!videoPath) {
    throw new Error("Aucune vidéo dans output/video/ — lance d'abord npm run demo:video.");
  }

  console.log("🔍 PHASE 7 — Démo Quality Engine\n");
  console.log(`Vidéo contrôlée : ${videoPath}`);

  const report = await qualityEngine.inspect(videoPath);

  console.log("\nContrôles :");
  report.checks.forEach((check) => {
    console.log(
      `   ${check.ok ? "✅" : "❌"} ${check.label} — ${check.detail} (${check.weight} pts)`,
    );
  });

  console.log(`\nScore qualité : ${report.score}/100`);
  console.log(`Verdict        : ${report.verdict}${report.verdict === "PASS" ? " — prête pour validation humaine (READY_FOR_APPROVAL)" : ""}`);
  if (report.suggestions.length > 0) {
    console.log("\nSuggestions de correction :");
    report.suggestions.forEach((suggestion) => console.log(`   - ${suggestion}`));
  }

  console.log("\n✅ Démo Phase 7 terminée — le contrôle qualité fonctionne.");
}

main().catch((error) => {
  console.error(
    "❌ Démo échouée :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
