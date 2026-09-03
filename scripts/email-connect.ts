/**
 * CANAL GMAIL — Boucle de contrôle humain (Phase 8).
 *
 * Toutes les EMAIL_POLL_INTERVAL_SEC secondes : lit les messages non lus
 * de votre Gmail (circuit fermé : seule votre adresse est écoutée) et :
 *  - « aide »   → liste des commandes ;
 *  - « rapport » → résumé de la production (storage) ;
 *  - « valide/publie » → placeholder Phase 9 ;
 *  - tout autre message naturel → cerveau IA (DeepSeek) pour ajuster la stratégie.
 *
 * Lancement : npm run email:connect   (arrêt : Ctrl+C)
 */

import { emailProvider } from "../src/providers/email";
import { storageService } from "../src/lib/storage";
import { answerWithBrain } from "../src/lib/brain";
import { createLogger } from "../src/lib/logger";

const logger = createLogger("email:connect");

const HELP_TEXT = [
  "🤖 Goal-IA Content Engine — commandes par email :",
  " • aide — cette liste",
  " • rapport — résumé de la production",
  " • ou écrivez librement (idée, question) : la machine analyse via l'IA.",
].join("\n");

async function buildReport(): Promise<string> {
  const manifest = await storageService.listAll();
  const uploaded = manifest.filter((record) => record.status === "UPLOADED");
  const videos = uploaded.filter((record) => record.kind === "video");
  const voices = uploaded.filter((record) => record.kind === "voice");
  return [
    "📊 RAPPORT GOAL-IA",
    `Fichiers sur R2/Supabase : ${uploaded.length}`,
    ` • Vidéos finales : ${videos.length}`,
    ` • Voix off : ${voices.length}`,
    "",
    "Pipeline de production opérationnel (idée → QC).",
  ].join("\n");
}

async function handleIncomingEmail(email: {
  from: string;
  subject: string;
  text: string;
}): Promise<void> {
  const body = email.text.trim().toLowerCase();

  if (body === "aide" || body === "help") {
    await emailProvider.sendText(email.from, "🤖 Aide Goal-IA", HELP_TEXT);
    return;
  }
  if (body === "rapport") {
    await emailProvider.sendText(email.from, "📊 Rapport Goal-IA", await buildReport());
    return;
  }
  if (/(valide|publie)/.test(body)) {
    await emailProvider.sendText(
      email.from,
      "🚧 Publication",
      "Validation/publication : bientôt disponible (Phase 9). Écrivez librement : la machine analyse votre idée via l'IA.",
    );
    return;
  }

  const reply = await answerWithBrain(email.text);
  await emailProvider.sendText(email.from, "🧠 Goal-IA — analyse", reply);
}

async function main(): Promise<void> {
  const user = process.env.GMAIL_USER?.trim();
  if (!user) {
    logger.error("GMAIL_USER manquant dans .env.local");
    process.exit(1);
  }
  console.log("📧 CANAL GMAIL — contrôle humain (décision utilisateur)");
  console.log(`   Compte : ${user} — circuit fermé (seule cette adresse est écoutée)`);
  console.log("   Arrêt : Ctrl+C\n");

  await emailProvider.sendText(
    user,
    "🤖 Goal-IA Content Engine — actif",
    "Le canal Gmail est opérationnel.\n\nEnvoyez un email à cette adresse :\n• « aide » pour les commandes\n• « rapport » pour un résumé\n• ou écrivez librement : la machine analyse via l'IA.",
  );
  console.log("✅ Email de démarrage envoyé — vérifiez votre boîte Gmail.");

  const pollIntervalSec = Number(process.env.EMAIL_POLL_INTERVAL_SEC ?? 20);

  const tick = async () => {
    try {
      const messages = await emailProvider.fetchOwnUnseen(15);
      for (const message of messages) {
        logger.info("Email reçu — traitement", { subject: message.subject });
        await handleIncomingEmail(message);
      }
    } catch (error) {
      logger.error("Boucle Gmail : erreur", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  await tick();
  setInterval(() => void tick(), pollIntervalSec * 1000);
}

process.on("SIGINT", () => process.exit(0));

main().catch((error) => {
  console.error("❌ Gmail :", error instanceof Error ? error.message : error);
  process.exit(1);
});
