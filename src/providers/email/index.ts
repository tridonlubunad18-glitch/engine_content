/**
 * GMAIL PROVIDER — Canal de contrôle humain (décision utilisateur 02/09/2026).
 *
 * Remplace WhatsApp comme interface principale (PRD §3.10 amendé) : plus
 * simple, sans QR ni session. Circuit fermé : SEULE l'adresse GMAIL_USER
 * est écoutée et destinataire des réponses.
 *
 * - ENVOI : Gmail SMTP (mot de passe d'application) via nodemailer.
 * - LECTURE : Gmail IMAP (imapflow) — boîte INBOX, messages non lus,
 *   marqués comme lus après traitement.
 */

import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createLogger } from "@/lib/logger";

const logger = createLogger("provider:email");

export interface EmailConfig {
  user: string;
  appPassword: string;
}

export interface IncomingEmail {
  uid: number;
  from: string;
  subject: string;
  text: string;
  date: Date;
}

function readConfig(): EmailConfig {
  const user = process.env.GMAIL_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !appPassword) {
    throw new Error(
      "GMAIL_USER / GMAIL_APP_PASSWORD manquants (voir .env.local et .env.example).",
    );
  }
  return { user, appPassword };
}

function sameAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export class EmailProvider {
  /** Envoie un email texte depuis votre Gmail. */
  async sendText(to: string, subject: string, text: string): Promise<void> {
    const { user, appPassword } = readConfig();
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass: appPassword },
    });
    try {
      await transport.sendMail({
        from: user,
        to,
        subject,
        text,
      });
      logger.info("Gmail : email envoyé", { to, subject });
    } finally {
      transport.close();
    }
  }

  /**
   * Récupère les messages NON LUS de l'INBOX (circuit fermé : seuls les
   * emails provenant de GMAIL_USER sont retournés), puis les marque lus.
   */
  async fetchOwnUnseen(limit = 15): Promise<IncomingEmail[]> {
    const { user, appPassword } = readConfig();
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user, pass: appPassword },
      logger: false,
    });

    await client.connect();
    const results: IncomingEmail[] = [];
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const search = await client.search({ seen: false }, { uid: true });
        const uids = (Array.isArray(search) ? search : []).slice(-limit);
        for (const uid of uids) {
          try {
            const message = await client.fetchOne(uid, { source: true });
            if (!message || !message.source) continue;
            const parsed = await simpleParser(message.source);
            const from = parsed.from?.value?.[0]?.address ?? "";
            if (!from || !sameAddress(from, user)) {
              logger.debug("Gmail : email d'un expéditeur non autorisé ignoré", {
                from,
              });
              continue;
            }
            results.push({
              uid,
              from,
              subject: parsed.subject ?? "",
              text: (parsed.text ?? "").trim(),
              date: parsed.date ?? new Date(),
            });
          } catch (error) {
            logger.warn("Gmail : email illisible ignoré", {
              uid,
              error: error instanceof Error ? error.message : String(error),
            });
          } finally {
            await client.messageFlagsAdd(uid, ["\\Seen"]).catch(() => undefined);
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    if (results.length > 0) {
      logger.info("Gmail : nouveaux messages traités", { count: results.length });
    }
    return results;
  }
}

/** Instance partagée. */
export const emailProvider = new EmailProvider();
