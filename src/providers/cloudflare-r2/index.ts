/**
 * CLOUDFLARE R2 PROVIDER — PRD §3.5 et §30.
 * R2 = coffre-fort des fichiers lourds (vidéos, voix off, exports,
 * previews, assets). Les métadonnées restent dans Supabase.
 *
 * R2 est compatible API S3 → client AWS SDK v3 (recommandation
 * officielle Cloudflare). Provider isolé, créé à la demande.
 *
 * Phase 0 : connecteur prêt à l'emploi (aucune clef requise au build).
 * Les uploads/téléchargements seront implémentés en PHASE 6 (PRD §37).
 *
 * ⚠️ Server-only : ne jamais importer depuis un composant client.
 */

import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[R2Provider] Variable d'environnement manquante : ${name}. Voir .env.example.`,
    );
  }
  return value;
}

/** Retourne le client S3 pointant vers Cloudflare R2 (créé une seule fois). */
export function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }
  const accountId = readEnv("R2_ACCOUNT_ID");
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: readEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: readEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

/** Retourne le nom du bucket R2 dédié aux contenus. */
export function getR2Bucket(): string {
  return readEnv("R2_BUCKET_NAME");
}
