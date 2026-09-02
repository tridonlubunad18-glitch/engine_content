/**
 * DÉMO PHASE 1 — Cerveau.
 *
 * Chaîne complète des engines en conditions réelles (DeepSeek) :
 * STRATÉGIE → ANGLE → HOOK → SCRIPT → VARIANTES.
 *
 * Lancement : npm run demo:brain
 * (nécessite DEEPSEEK_API_KEY dans .env.local — voir .env.example)
 *
 * Aucun secret affiché ; aucun stockage : simple validation du cerveau.
 */

import { StrategyEngine } from "../src/engines/strategy-engine";
import { AngleEngine } from "../src/engines/angle-engine";
import { HookEngine } from "../src/engines/hook-engine";
import { ScriptEngine } from "../src/engines/script-engine";

async function main(): Promise<void> {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(
      "DEEPSEEK_API_KEY absente. Copie .env.example vers .env.local puis ajoute ta clé.",
    );
    process.exit(1);
  }

  const strategyEngine = new StrategyEngine();
  const angleEngine = new AngleEngine();
  const hookEngine = new HookEngine();
  const scriptEngine = new ScriptEngine();

  console.log("🧠 PHASE 1 — Démo Cerveau (DeepSeek réel)\n");

  // 1. STRATÉGIE
  const plan = await strategyEngine.analyze({
    ideas: [
      "Les parieurs composent des coupons trop chargés",
      "Pourquoi on perd ses paris en fin de mois",
      "Gérer sa bankroll simplement",
      "Les 3 erreurs des débutants quand ils lisent les cotes",
    ],
    maxDirections: 2,
  });
  console.log("1) STRATÉGIE — directions retenues :");
  plan.directions.forEach((direction, index) => {
    console.log(
      `   ${index + 1}. [${direction.priority}] ${direction.idea} — angle : ${direction.suggestedAngle}`,
    );
  });

  const direction = plan.directions[0];
  if (!direction) {
    throw new Error("Aucune direction stratégique retournée.");
  }

  // 2. ANGLES
  const angles = await angleEngine.generateAngles({
    idea: direction.idea,
    count: 3,
  });
  console.log("\n2) ANGLES :");
  angles.forEach((angle, index) => {
    console.log(`   ${index + 1}. (${angle.angleType}) ${angle.title} — ${angle.summary}`);
  });
  const angle = angles[0];
  if (!angle) {
    throw new Error("Aucun angle retourné.");
  }

  // 3. HOOKS
  const hooks = await hookEngine.generateHooks({
    topic: direction.idea,
    angle,
    count: 4,
  });
  console.log("\n3) HOOKS :");
  hooks.forEach((hook, index) => {
    console.log(`   ${index + 1}. [${hook.style}] « ${hook.text} »`);
  });
  const hook = hooks[0];
  if (!hook) {
    throw new Error("Aucun hook retourné.");
  }

  // 4. SCRIPT (template Problem→Solution, ~45 s)
  const script = await scriptEngine.generateScript({
    topic: direction.idea,
    angle,
    hook,
    template: "problem-solution",
    durationSec: 45,
  });
  console.log("\n4) SCRIPT — template problem-solution :");
  console.log(`   Titre : ${script.title}`);
  console.log(`   Durée cible : ${script.durationSec} s (${script.estimatedWords} mots estimés)`);
  script.scenes.forEach((scene) => {
    console.log(`   [${scene.role} ~${scene.durationSec}s] ${scene.narration}`);
    if (scene.onScreenText) {
      console.log(`        📺 texte écran : ${scene.onScreenText}`);
    }
  });
  console.log(`   CTA : « ${script.cta} »`);
  console.log(`   Voix off complète : ${script.voiceoverText}`);

  // 5. VARIANTES
  const variants = await scriptEngine.generateVariants({
    script,
    count: 2,
    focus: "hook",
  });
  console.log("\n5) VARIANTES (focus hook) :");
  variants.forEach((variant) => {
    console.log(`   - ${variant.label}`);
    console.log(`     hook : « ${variant.hookText} »`);
    console.log(`     voix off : ${variant.voiceoverText}`);
  });

  console.log("\n✅ Démo Phase 1 terminée — le cerveau fonctionne.");
}

main().catch((error) => {
  console.error("❌ Démo échouée :", error instanceof Error ? error.message : error);
  process.exit(1);
});
