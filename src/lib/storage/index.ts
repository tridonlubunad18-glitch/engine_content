/**
 * STORAGE — PRD §3.5 / §14 / §30. Phase 6.
 *
 * CLOUDFLARE R2 = entrepôt des fichiers lourds (voix off, vidéos,
 * exports, previews) ; Supabase (table `files`, PRD §29) = métadonnées.
 *
 * Phase 6 implémente :
 * - `uploadFile()` : upload R2 réel (PutObject) avec Content-Type ;
 * - métadonnées persistées localement dans `output/storage/manifest.json`
 *   (statuts, versioning, checksum) ;
 * - le schéma Supabase prêt à exécuter : `supabase/init.sql` (voir fichier).
 *   → Après exécution du SQL par l'utilisateur, les métadonnées seront
 *     écrites dans Supabase (bascule prévue, PRD §30 : R2 = coffre-fort,
 *     Supabase = mémoire).
 */

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createLogger } from "@/lib/logger";
import {
  getR2Bucket,
  getR2Client,
} from "@/providers/cloudflare-r2";

const logger = createLogger("lib:storage");

export type FileKind =
  | "voice"
  | "video"
  | "preview"
  | "image"
  | "audio"
  | "other";

export type FileStatus = "UPLOADED" | "FAILED";

export interface StoredFileMeta {
  id: string;
  /** Chemin dans le bucket R2 (ex. content/2026/09/01/CONTENT-001/final.mp4). */
  key: string;
  kind: FileKind;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  status: FileStatus;
  /** Numéro de version (incrémenté par clé à chaque upload). */
  version: number;
  uploadedAt: string | null;
  sha256: string;
}

export interface UploadOptions {
  key: string;
  kind?: FileKind;
}

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function contentTypeFor(fileName: string): string {
  return CONTENT_TYPES[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

function manifestPath(): string {
  return path.resolve(process.cwd(), "output", "storage", "manifest.json");
}

async function readManifest(): Promise<StoredFileMeta[]> {
  try {
    const raw = await fs.readFile(manifestPath(), "utf8");
    const parsed = JSON.parse(raw) as StoredFileMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeManifest(records: StoredFileMeta[]): Promise<void> {
  const file = manifestPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(records, null, 2), "utf8");
}

async function computeSha256(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export class StorageService {
  /**
   * Uploade un fichier local vers R2 (clé = chemin dans le bucket).
   * Journalise la métadonnée dans le manifest local.
   */
  async uploadFile(
    localPath: string,
    options: UploadOptions,
  ): Promise<StoredFileMeta> {
    const client = getR2Client();
    const bucket = getR2Bucket();

    if (!options.key || options.key.trim().length === 0) {
      throw new Error("Clé R2 (key) vide — impossible d'uploader.");
    }
    const key = options.key.replace(/\\/g, "/").replace(/^\/+/, "");

    const fileBuffer = await fs.readFile(localPath);
    const fileName = path.basename(localPath);
    const sha256 = await computeSha256(localPath);
    const contentType = contentTypeFor(fileName);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
          Metadata: { sha256 },
        }),
      );
    } catch (error) {
      const record = await this.buildRecord({
        key,
        kind: options.kind ?? this.inferKind(fileName),
        fileName,
        sizeBytes: fileBuffer.length,
        contentType,
        status: "FAILED",
        sha256,
      });
      await this.persist(record);
      logger.error("Upload R2 échoué", { key, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    const record = await this.buildRecord({
      key,
      kind: options.kind ?? this.inferKind(fileName),
      fileName,
      sizeBytes: fileBuffer.length,
      contentType,
      status: "UPLOADED",
      sha256,
    });
    await this.persist(record);

    logger.info("Upload R2 réussi", {
      key,
      sizeBytes: record.sizeBytes,
      version: record.version,
      bucket,
    });
    return record;
  }

  /** Vérifie côté R2 qu'un objet existe (HeadObject). */
  async headRemote(key: string): Promise<{ exists: boolean; sizeBytes: number }> {
    const client = getR2Client();
    const bucket = getR2Bucket();
    try {
      const result = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return {
        exists: true,
        sizeBytes: Number(result.ContentLength ?? 0),
      };
    } catch {
      return { exists: false, sizeBytes: 0 };
    }
  }

  /** Liste les métadonnées connues (manifest local). */
  async listAll(): Promise<StoredFileMeta[]> {
    return readManifest();
  }

  private inferKind(fileName: string): FileKind {
    const extension = path.extname(fileName).toLowerCase();
    if (extension === ".mp3" || extension === ".wav") return "voice";
    if (extension === ".mp4" || extension === ".mov" || extension === ".webm") {
      return "video";
    }
    if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") {
      return "image";
    }
    return "other";
  }

  private async buildRecord(input: {
    key: string;
    kind: FileKind;
    fileName: string;
    sizeBytes: number;
    contentType: string;
    status: FileStatus;
    sha256: string;
  }): Promise<StoredFileMeta> {
    const records = await readManifest();
    const previous = records.filter((record) => record.key === input.key);
    const version = previous.length + 1;
    return {
      id: `${input.key}#v${version}`,
      key: input.key,
      kind: input.kind,
      fileName: input.fileName,
      sizeBytes: input.sizeBytes,
      contentType: input.contentType,
      status: input.status,
      version,
      uploadedAt: input.status === "UPLOADED" ? new Date().toISOString() : null,
      sha256: input.sha256,
    };
  }

  private async persist(record: StoredFileMeta): Promise<void> {
    const records = await readManifest();
    records.push(record);
    await writeManifest(records);
  }
}

/** Instance partagée. */
export const storageService = new StorageService();


