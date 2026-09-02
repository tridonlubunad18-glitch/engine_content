import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Goal-IA Content Engine",
  description:
    "Machine personnelle d'automatisation de contenu vidéo, publication et apprentissage pour Goal-IA (PRD v2.0).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
