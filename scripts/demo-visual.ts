/**
 * DÉMO PHASE 4 — Visual + Templates.
 *
 * Construit le plan visuel d'un script (template problem-solution) en
 * sélectionnant de VRAIS assets de la bibliothèque (Phase 2), scène par
 * scène : mode visuel, transition, zoom, emphase de texte + statistiques
 * PRD §11. Logique 100 % déterministe, aucun appel externe.
 *
 * Lancement : npm run demo:visual
 */

import { visualEngine } from "../src/engines/visual-engine";
import { VISUAL_STYLES } from "../src/engines/template-engine";
import type { VideoScript } from "../src/engines/script-engine";

const SAMPLE_SCRIPT: VideoScript = {
  title: "Stop au coupon trop chargé",
  template: "problem-solution",
  durationSec: 45,
  hookText: "Pourquoi ton coupon de huit matchs va tomber ?",
  cta: "Télécharge Goal-IA et construis enfin des coupons qui tiennent la route.",
  voiceoverText:
    "Pourquoi ton coupon de huit matchs va tomber ? Chaque pari en plus, c'est plus de risque. Résultat : tu perds ton argent. Avec Goal-IA, on simplifie. Moins de paris, plus de chances. Télécharge Goal-IA.",
  estimatedWords: 45,
  scenes: [
    {
      role: "HOOK",
      narration: "Pourquoi ton coupon de huit matchs va tomber ?",
      onScreenText: "TON COUPON VA TOMBER",
      visualHint: "B-roll d'un parieur qui regarde son téléphone, expression tendue",
      durationSec: 4,
    },
    {
      role: "PROBLEME",
      narration: "Chaque pari en plus, c'est plus de risque.",
      onScreenText: "+1 MATCH = +1 RISQUE",
      visualHint: "B-roll gros plan sur un écran de téléphone",
      durationSec: 8,
    },
    {
      role: "DEMO",
      narration: "Avec Goal-IA, on simplifie.",
      onScreenText: "GOAL-IA SIMPLIFIE",
      visualHint: "capture d'écran de l'application Goal-IA : création du coupon",
      durationSec: 10,
    },
    {
      role: "SOLUTION",
      narration: "Moins de paris, plus de chances.",
      onScreenText: "MOINS DE PARIS = PLUS DE CHANCES",
      visualHint: "capture vidéo de l'application Goal-IA : coupon simplifié",
      durationSec: 8,
    },
    {
      role: "CTA",
      narration: "Télécharge Goal-IA et construis des coupons solides.",
      onScreenText: "TÉLÉCHARGE GOAL-IA",
      visualHint: "logo Goal-IA à l'écran avec texte final",
      durationSec: 5,
    },
  ],
};

async function main(): Promise<void> {
  console.log("🎬 PHASE 4 — Démo Visual + Templates\n");

  console.log("Styles visuels disponibles :");
  VISUAL_STYLES.forEach((style) => console.log(`   - ${style.id} : ${style.label}`));

  const plan = await visualEngine.buildVisualPlan({
    script: SAMPLE_SCRIPT,
    styleId: "impact-rapide",
  });

  console.log(`\nPlan visuel du script « ${plan.scriptTitle} » (style ${plan.characteristics.styleId}) :\n`);
  plan.scenes.forEach((scene, index) => {
    const asset = scene.asset
      ? `${scene.asset.relativePath}${scene.assetContentUnverified ? " (contenu non vérifié)" : ""}`
      : "❌ AUCUN ASSET";
    console.log(
      `  ${index + 1}. [${scene.role} ~${scene.durationSec}s] mode=${scene.mode} | ${asset}`,
    );
    console.log(
      `     transition=${scene.transition}${scene.zoom ? ` zoom=${scene.zoom.type}×${scene.zoom.factor}` : ""} texte=${scene.textEmphasis}`,
    );
  });

  console.log("\nCaractéristiques visuelles (PRD §11) :");
  console.log(`   ${JSON.stringify(plan.characteristics, null, 2)}`);

  console.log(`\nAssets utilisés : ${plan.assetsUsed.length}`);
  plan.assetsUsed.forEach((asset) => console.log(`   - ${asset.relativePath}`));

  console.log(`\n⚠️ Warnings : ${plan.warnings.length}`);
  plan.warnings.forEach((warning) => console.log(`   - ${warning}`));
  console.log(`❌ Assets manquants : ${plan.missingAssets.length}`);
  plan.missingAssets.forEach((missing) =>
    console.log(`   - ${missing.description} (${missing.reason})`),
  );

  console.log("\n✅ Démo Phase 4 terminée — le plan visuel fonctionne.");
}

main().catch((error) => {
  console.error(
    "❌ Démo échouée :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
