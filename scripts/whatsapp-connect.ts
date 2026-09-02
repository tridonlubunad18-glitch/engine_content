/**
 * PHASE 8 — Connexion WhatsApp (session longue, à lancer dans un terminal).
 *
 * Démarre whatsapp-web.js, génère le QR (output/whatsapp/qr.png au 1er
 * lancement), puis répond aux commandes envoyées par VOTRE numéro
 * (circuit fermé) :
 *   « aide »        → liste des commandes
 *   « rapport »     → résumé de la production (manifest storage)
 *
 * Lancement : npm run whatsapp:connect
 * (arrêt : Ctrl+C)
 */

import { whatsappProvider } from "../src/providers/whatsapp";
import { storageService } from "../src/lib/storage";

const HELP_TEXT = [
  "🤖 Goal-IA Content Engine",
  "Commandes disponibles (Phase 8 — v1) :",
  " • aide — cette liste",
  " • rapport — résumé de la production (fichiers stockés)",
  "",
  "À venir : valider une vidéo, lancer une production, rapports quotidiens.",
].join("\n");

async function buildReport(): Promise<string> {
  const manifest = await storageService.listAll();
  const uploaded = manifest.filter((record) => record.status === "UPLOADED");
  const videos = uploaded.filter((record) => record.kind === "video");
  const voices = uploaded.filter((record) => record.kind === "voice");

  return [
    "📊 RAPPORT GOAL-IA (Phase 8 v1)",
    `Fichiers sur R2/Supabase : ${uploaded.length}`,
    ` • Vidéos finales : ${videos.length}`,
    ` • Voix off : ${voices.length}`,
    "",
    "Le pipeline de production est opérationnel (idée → QC).",
  ].join("\n");
}

async function main(): Promise<void> {
  console.log("📲 PHASE 8 — Connexion WhatsApp");
  console.log("   (1er lancement : scannez le QR code généré dans output/whatsapp/qr.png)");
  console.log("   Arrêt : Ctrl+C\n");

  const allowed = (process.env.WHATSAPP_ALLOWED_NUMBER ?? "").trim();
  if (!allowed) {
    console.warn("⚠️  WHATSAPP_ALLOWED_NUMBER n'est pas configuré : les messages seront ignorés.");
  } else {
    console.log(`   Numéro autorisé : ${allowed}`);
  }

  whatsappProvider.onInbound(async (message) => {
    const body = message.body.trim().toLowerCase();
    if (body === "aide" || body === "help" || body === "bonjour") {
      await whatsappProvider.sendMessage(message.from, HELP_TEXT);
      return;
    }
    if (body === "rapport") {
      const report = await buildReport();
      await whatsappProvider.sendMessage(message.from, report);
      return;
    }
    await whatsappProvider.sendMessage(
      message.from,
      `Message reçu (« ${body.slice(0, 60)} »). Tape « aide » pour les commandes.`,
    );
  });

  await whatsappProvider.start();

  // Maintient la session ouverte.
  setInterval(() => undefined, 60_000);
}

main().catch((error) => {
  console.error("❌ WhatsApp :", error instanceof Error ? error.message : error);
  process.exit(1);
});

// Garde le processus vivant (Node).
process.on("SIGINT", async () => {
  await whatsappProvider.stop();
  process.exit(0);
});
