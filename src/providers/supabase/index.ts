/**
 * SUPABASE PROVIDER — PRD §3.4 et §30.
 * Supabase = mémoire structurée du Content Engine (le « cerveau »).
 *
 * Phase 0 : connecteur prêt à l'emploi (client créé à la demande,
 * aucune clef requise au build). Le schéma des tables (PRD §29) sera
 * défini et typé en Phase 1.
 *
 * ⚠️ Server-only : ne jamais importer depuis un composant client
 * (la clef service_role ne doit jamais fuiter dans le frontend).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[SupabaseProvider] Variable d'environnement manquante : ${name}. Voir .env.example.`,
    );
  }
  return value;
}

/**
 * Retourne un client Supabase (créé une seule fois puis mis en cache).
 * Utilise la clef service_role si présente (côté serveur uniquement),
 * sinon la clef anon.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }
  const url = readEnv("SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? readEnv("SUPABASE_ANON_KEY");
  cachedClient = createClient(url, key);
  return cachedClient;
}
