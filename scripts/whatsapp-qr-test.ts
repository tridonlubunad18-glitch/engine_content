/**
 * TEST PHASE 8 — Génération du QR code WhatsApp (one-shot).
 *
 * Démarre la session whatsapp-web.js et attend que le QR code soit écrit
 * dans output/whatsapp/qr.png, puis arrête le processus. Utile pour
 * vérifier que la pile fonctionne avant un vrai scan.
 *
 * Lancement : npm run whatsapp:qr-test
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { whatsappProvider } from "../src/providers/whatsapp";

const QR_PATH = path.resolve(process.cwd(), "output", "whatsapp", "qr.png");
const TIMEOUT_MS = 45_000;

async function waitForFile(filePath: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > 0) return true;
    } catch {
      /* pas encore écrit */
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

async function main(): Promise<void> {
  console.log("📲 PHASE 8 — Test QR code WhatsApp\n");

  const startPromise = whatsappProvider.start().catch((error) => {
    console.error("❌ Démarrage WhatsApp échoué :", error.message);
    process.exit(1);
  });

  const qrReady = await waitForFile(QR_PATH, TIMEOUT_MS);
  if (qrReady) {
    console.log("✅ QR code généré :", QR_PATH);
    console.log("   Ouvrez ce fichier et scannez-le avec votre téléphone (session test).");
  } else {
    console.log("⚠️ QR code non généré dans le délai.");
  }

  await whatsappProvider.stop();
  await startPromise;
  console.log(qrReady ? "\n✅ Test Phase 8 terminé — la pile WhatsApp fonctionne." : "\n❌ Échec du test QR.");
  process.exit(qrReady ? 0 : 1);
}

main();
