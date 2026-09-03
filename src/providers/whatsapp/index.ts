/**
 * WHATSAPP PROVIDER — PRD §3.10/§24, Phase 8.
 *
 * MODE CHOISI (décision utilisateur 02/09/2026) : intégration DIRECTE via
 * `whatsapp-web.js` — session WhatsApp Web locale, SANS API Meta payante
 * (ni Whapi/Z-API). Provider isolé → remplaçable (voie Meta conservée
 * dans .env.example pour référence).
 *
 * - QR code au premier lancement (PNG dans output/whatsapp/qr.png) ;
 * - session persistée par LocalAuth (dossier `.wwebjs_auth`, jamais commité) ;
 * - CIRCUIT FERMÉ : seuls les numéros listés dans WHATSAPP_ALLOWED_NUMBER
 *   déclenchent des réponses (anti-ban ~0, usage personnel).
 *
 * ⚠️ Server-only ; à exécuter localement (le rendu/puppeteer n'est pas
 * adapté aux fonctions serverless Vercel).
 */

import path from "node:path";
import { existsSync, promises as fs } from "node:fs";
import WhatsAppWeb from "whatsapp-web.js";
import QRCode from "qrcode";
import { createLogger } from "@/lib/logger";

const logger = createLogger("provider:whatsapp");

const { Client, LocalAuth } = WhatsAppWeb;

export interface WhatsAppInboundMessage {
  from: string;
  body: string;
  timestamp: number;
}

export type WhatsAppMessageListener = (
  message: WhatsAppInboundMessage,
) => void | Promise<void>;

const BROWSER_CANDIDATES = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

export function detectBrowser(): string | null {
  const fromEnv = process.env.WHATSAPP_BROWSER_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return BROWSER_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
}

function normalizeNumber(value: string): string {
  return value.replace(/\D/g, "");
}

function allowedNumbers(): string[] {
  const raw = process.env.WHATSAPP_ALLOWED_NUMBER ?? "";
  return raw
    .split(",")
    .map((part) => normalizeNumber(part))
    .filter((part) => part.length >= 8);
}

export class WhatsAppProvider {
  private client: InstanceType<typeof Client> | null = null;
  private readonly listeners: WhatsAppMessageListener[] = [];

  private readonly authPath: string;
  private readonly executablePath: string | null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  constructor() {
    this.authPath =
      process.env.WHATSAPP_SESSION_PATH?.trim() || ".wwebjs_auth";
    this.executablePath = detectBrowser();
  }

  get isStarted(): boolean {
    return this.client !== null;
  }

  /** Abonne un récepteur aux messages autorisés (circuit fermé). */
  onInbound(listener: WhatsAppMessageListener): void {
    this.listeners.push(listener);
  }

  /** Démarre la session WhatsApp Web (QR au premier lancement). */
  async start(): Promise<void> {
    if (this.client) {
      logger.info("WhatsApp : déjà démarré");
      return;
    }
    if (!this.executablePath) {
      throw new Error(
        "Aucun navigateur compatible (Edge/Chrome) trouvé. Installez Chrome ou Edge, ou définissez WHATSAPP_BROWSER_PATH.",
      );
    }

    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.authPath }),
      puppeteer: {
        headless: process.env.WHATSAPP_HEADLESS?.toLowerCase() !== "false",
        executablePath: this.executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      },
    });
    this.client = client;

    client.on("qr", (qr) => {
      this.reconnectAttempts = 0;
      void this.handleQr(qr);
    });
    client.on("ready", () => {
      this.reconnectAttempts = 0;
      logger.info("WhatsApp : session prête (authentifié)");
    });
    client.on("authenticated", () => {
      this.reconnectAttempts = 0;
      logger.info("WhatsApp : authentifié (session conservée dans .wwebjs_auth)");
    });
    client.on("auth_failure", (message) => {
      logger.error("WhatsApp : échec d'authentification — nouveau QR nécessaire", {
        message,
      });
      void this.handleSessionLost("auth_failure");
    });
    client.on("disconnected", (reason) => {
      logger.warn("WhatsApp : déconnecté", { reason });
      void this.handleSessionLost(reason);
    });
    client.on("message", (message) => {
      void this.handleIncoming(message);
    });

    logger.info("WhatsApp : démarrage de la session…", {
      authPath: this.authPath,
      allowedNumbers: allowedNumbers().length,
    });
    await client.initialize();
  }

  /** Envoie un message (numéro au format international). */
  async sendMessage(to: string, text: string): Promise<boolean> {
    if (!this.client) {
      logger.warn("WhatsApp : envoi impossible (session non démarrée)");
      return false;
    }
    try {
      await this.client.sendMessage(to, text);
      logger.info("WhatsApp : message envoyé", { to });
      return true;
    } catch (error) {
      logger.error("WhatsApp : envoi échoué", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /** Arrête proprement la session. */
  async stop(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      await this.client.destroy().catch(() => undefined);
      this.client = null;
      logger.info("WhatsApp : session arrêtée");
    }
  }

  /**
   * Session perdue (redéploiement Render, déconnexion…) : détruit
   * l'ancien client puis relance une session (nouveau QR) sans crasher.
   */
  private async handleSessionLost(reason: string): Promise<void> {
    if (this.reconnectTimer) return; // une reconnexion est déjà planifiée
    const previous = this.client;
    this.client = null;
    await previous?.destroy().catch(() => undefined);

    const delayMs = Math.min(2_000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts += 1;
    logger.warn("WhatsApp : reconnexion automatique planifiée", {
      reason,
      delayMs,
      attempts: this.reconnectAttempts,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch((error) => {
        logger.error("WhatsApp : échec de reconnexion", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, delayMs);
  }

  /** Écrit le QR code en PNG ET en texte (logs Render) pour le scanner. */
  private async handleQr(qr: string): Promise<void> {
    // 1) QR en texte/terminal → visible dans les logs Render
    try {
      const ascii = await QRCode.toString(qr, { type: "terminal", small: true });
      console.log("\n════════════════════════════════════════");
      console.log("📲 SCANNEZ CE QR CODE (WhatsApp → Appareils connectés)");
      console.log("════════════════════════════════════════");
      console.log(ascii);
      console.log("════════════════════════════════════════\n");
    } catch (error) {
      logger.error("WhatsApp : impossible de générer le QR texte", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2) Copie PNG locale (pratique en dev)
    try {
      const dir = path.resolve(process.cwd(), "output", "whatsapp");
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, "qr.png");
      await QRCode.toFile(filePath, qr, { width: 360 });
      logger.warn("WhatsApp : QR code aussi écrit en PNG", { filePath });
    } catch (error) {
      logger.error("WhatsApp : impossible d'écrire le QR PNG", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Circuit fermé : ne traite que les numéros autorisés. */
  private async handleIncoming(message: {
    from?: string;
    body?: string;
    timestamp?: number;
  }): Promise<void> {
    const from = message.from ?? "";
    const body = message.body ?? "";
    const allowed = allowedNumbers();
    const fromDigits = normalizeNumber(from);

    if (allowed.length === 0) {
      logger.debug("WhatsApp : message ignoré (aucun numéro autorisé configuré)");
      return;
    }
    const isAllowed = allowed.some(
      (number) => fromDigits.endsWith(number) || number.endsWith(fromDigits),
    );
    if (!isAllowed) {
      logger.warn("WhatsApp : message d'un numéro non autorisé ignoré", {
        from: fromDigits.slice(0, 6),
      });
      return;
    }

    const inbound: WhatsAppInboundMessage = {
      from,
      body,
      timestamp: message.timestamp ?? Math.floor(Date.now() / 1000),
    };
    logger.info("WhatsApp : message autorisé reçu", {
      bodyLength: body.length,
    });

    for (const listener of this.listeners) {
      try {
        await listener(inbound);
      } catch (error) {
        logger.error("WhatsApp : erreur du gestionnaire de message", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

/** Instance partagée. */
export const whatsappProvider = new WhatsAppProvider();


