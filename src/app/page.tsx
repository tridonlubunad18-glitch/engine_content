export default function Home() {
  const phases = [
    { id: "P0", label: "Architecture", done: true },
    { id: "P1", label: "Cerveau", done: true },
    { id: "P2", label: "Assets", done: true },
    { id: "P3", label: "Voix", done: true },
    { id: "P4", label: "Visual + Templates", done: true },
    { id: "P5", label: "Video", done: true },
    { id: "P6", label: "Storage", done: true },
    { id: "P7", label: "QC", done: true },
    { id: "P8", label: "WhatsApp", done: false, current: true },
    { id: "P9", label: "Publication", done: false },
    { id: "P10", label: "Analytics", done: false },
    { id: "P11", label: "Learning", done: false },
  ];
  const font =
    "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "48px auto",
        padding: "0 24px",
        fontFamily: font,
        lineHeight: 1.6,
        color: "#0f172a",
      }}
    >
      <h1 style={{ fontSize: 26, margin: "0 0 6px" }}>Goal-IA Content Engine</h1>
      <p style={{ color: "#475569", margin: "0 0 20px" }}>
        Machine d&apos;automatisation de contenu — pipeline de production opérationnel
        (idée → vidéo contrôlée, stockée sur R2 + Supabase).
      </p>

      <h2 style={{ fontSize: 15, color: "#64748b", margin: "0 0 10px" }}>Avancement des phases</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {phases.map((phase) => (
          <span
            key={phase.id}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              color: phase.done ? "#065f46" : phase.current ? "#1d4ed8" : "#475569",
              background: phase.done ? "#d1fae5" : phase.current ? "#dbeafe" : "#f1f5f9",
              border: phase.current ? "1px solid #1d4ed8" : "none",
            }}
          >
            {phase.done ? "✅" : phase.current ? "🚧" : "⏳"} {phase.id} · {phase.label}
          </span>
        ))}
      </div>

      <h2 style={{ fontSize: 15, color: "#64748b", margin: "0 0 10px" }}>
        Phase en cours : Phase 8 — WhatsApp (interface de contrôle humain)
      </h2>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>
        Le pipeline <strong>idée → script → voix → montage → QC → R2/Supabase</strong> est terminé et
        vérifié (démo vidéo : score QC 100/100). La Phase 8 ajoutera la commande par WhatsApp :
        valider, lancer des productions, recevoir les rapports.
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        Actions actuelles (CLI) : <code>npm run demo:brain · demo:assets · demo:voice · demo:visual ·
        demo:video · demo:storage · demo:qc</code> — voir README.
      </p>
    </main>
  );
}

