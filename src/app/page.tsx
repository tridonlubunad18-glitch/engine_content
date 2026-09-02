export default function Home() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "64px auto",
        padding: "0 24px",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <h1>Goal-IA Content Engine</h1>
      <p>
        Machine personnelle d&apos;automatisation de contenu vidéo, de
        publication et d&apos;apprentissage pour Goal-IA (PRD v2.0).
      </p>
      <h2>État actuel</h2>
      <p>
        <strong>Phase 0 — Architecture :</strong> terminée et vérifiée
        (typecheck, lint, build et runtime OK). Détail dans{" "}
        <code>PROJECT_STATUS.md</code>.
      </p>
      <p>
        Interface minimale volontaire (PRD §32) — l&apos;interface
        principale de contrôle sera WhatsApp.
      </p>
    </main>
  );
}
