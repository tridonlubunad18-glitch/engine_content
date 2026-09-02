/**
 * DÉMO PHASE 2 — Asset Engine.
 *
 * Test réel sur la bibliothèque locale `assets/` :
 * SCAN (indexation) → RECHERCHE (mots-clés + catégories) → DÉTECTION DE MANQUES.
 *
 * Lancement : npm run demo:assets
 * (aucun secret requis — la bibliothèque reste locale, jamais commitée)
 */

import {
  assetEngine,
  type AssetCategory,
} from "../src/engines/asset-engine";

async function main(): Promise<void> {
  console.log("📦 PHASE 2 — Démo Asset Engine\n");

  // 1) SCAN — indexation de la bibliothèque
  const assets = await assetEngine.scan();
  console.log(`1) SCAN — ${assets.length} assets indexés dans assets/`);
  if (assets.length === 0) {
    throw new Error(
      "Aucun asset trouvé : déposez vos fichiers dans assets/ (PRD §8) puis relancez.",
    );
  }
  const byCategory = new Map<AssetCategory, number>();
  for (const asset of assets) {
    byCategory.set(
      asset.category,
      (byCategory.get(asset.category) ?? 0) + 1,
    );
  }
  for (const [category, count] of byCategory) {
    console.log(`   ${category.padEnd(12)} : ${count}`);
  }

  // 2) RECHERCHE
  console.log("\n2) RECHERCHE :");
  const searches: Array<{ label: string; text: string; limit: number }> = [
    { label: "roulette", text: "roulette", limit: 3 },
    { label: "captures d'écran", text: "capture interface écran", limit: 3 },
    { label: "logo", text: "logo Goal-IA", limit: 3 },
    { label: "B-roll illustration", text: "b-roll parieur au téléphone", limit: 3 },
  ];
  for (const search of searches) {
    const results = await assetEngine.search({
      text: search.text,
      limit: search.limit,
    });
    console.log(
      `   « ${search.label} » → ${results.length} résultat(s) : ` +
        results
          .map((r) => `${r.relativePath} (score ${r.score})`)
          .join(" | "),
    );
  }

  // 3) DÉTECTION D'ASSETS MANQUANTS (PRD §9)
  console.log("\n3) DÉTECTION DE MANQUES (PRD §9) :");
  const results = await assetEngine.detectMissing([
    {
      description: "B-roll d'un parieur qui utilise son téléphone",
      quantity: 2,
    },
    {
      description: "capture d'écran de la page d'accueil de Goal-IA",
      quantity: 1,
    },
    {
      description: "logo Goal-IA à afficher en fin de vidéo",
      category: "logos",
      quantity: 2,
    },
  ]);

  for (const result of results) {
    if (result.missing) {
      console.log(`   ⚠️ MANQUANT : ${result.missing.description}`);
      console.log(`     raison : ${result.missing.reason}`);
    } else {
      console.log(`   ✅ TROUVÉ : ${result.demand.description}`);
      result.candidates.forEach((candidate) =>
        console.log(`     → ${candidate.relativePath} (score ${candidate.score})`),
      );
    }
  }

  console.log("\n✅ Démo Phase 2 terminée — l'Asset Engine fonctionne.");
}

main().catch((error) => {
  console.error(
    "❌ Démo échouée :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
