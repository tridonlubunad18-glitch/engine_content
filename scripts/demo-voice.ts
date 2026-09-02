/**
 * DÉMO PHASE 3 — Voice Engine (ElevenLabs réel).
 *
 * Génère la voix off d'un texte de script (type Phase 1) et l'écrit dans
 * output/voice/. Le provider bascule automatiquement entre vos comptes
 * ElevenLabs si l'un est saturé.
 *
 * Lancement : npm run demo:voice
 * (nécessite au moins une clé ELEVENLABS_API_KEY_01… dans .env.local)
 */

import { promises as fs } from "node:fs";
import {
  hasElevenLabsKeys,
  readElevenLabsApiKeys,
} from "../src/providers/elevenlabs";
import { voiceEngine } from "../src/engines/voice-engine";

const DEMO_TEXT = `Encore perdu ? Ton coupon a huit paris, c'est pour ça. Chaque pari en plus, c'est plus de risque. Huit paris, c'est presque impossible à gagner. Résultat : tu perds ton argent. Avec Goal-IA, on simplifie. L'application analyse les matchs et te propose un coupon avec moins de paris, mais plus solides. Moins de paris, plus de chances. Goal-IA t'aide à éviter les erreurs et à mieux gérer ta mise. Télécharge Goal-IA et construis enfin des coupons qui tiennent la route.`;

function countWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.length > 1 || (words.length === 1 && words[0].length > 0)
    ? words.length
    : 0;
}

async function main(): Promise<void> {
  if (!hasElevenLabsKeys()) {
    throw new Error(
      "Aucune clé ElevenLabs configurée. Ajoutez ELEVENLABS_API_KEY_01 (ou _02, _03…) dans .env.local puis relancez.",
    );
  }
  const accountCount = readElevenLabsApiKeys().length;
  console.log(
    `🎙️ PHASE 3 — Démo Voice Engine (${accountCount} compte(s) ElevenLabs configuré(s))\n`,
  );

  const words = countWords(DEMO_TEXT);
  console.log(
    `Texte : ${words} mots (≈ ${Math.max(1, Math.round((words / 150) * 60))} s estimées)`,
  );

  const result = await voiceEngine.generateVoiceover({
    text: DEMO_TEXT,
    label: "demo-coupons",
  });

  const stat = await fs.stat(result.filePath);
  console.log("\n✅ Voix générée et écrite :");
  console.log(`   fichier          : ${result.filePath}`);
  console.log(`   taille           : ${(stat.size / 1024).toFixed(1)} Ko`);
  console.log(`   durée estimée    : ${result.estimatedDurationSec} s`);
  console.log(`   voix             : ${result.voiceName} (${result.voiceId})`);
  console.log(`   modèle           : ${result.modelId}`);
  console.log(
    `   compte utilisé    : #${result.usedKeyIndex} sur ${accountCount}`,
  );

  console.log("\n✅ Démo Phase 3 terminée — la voix fonctionne.");
}

main().catch((error) => {
  console.error(
    "❌ Démo échouée :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
