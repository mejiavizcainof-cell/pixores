import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Background Remover - Remove Background Online",
  description: "Remove image backgrounds automatically and download a transparent high-quality PNG with the Pixores AI Background Remover.",
  keywords: ["background remover", "AI background remover", "remove background", "transparent PNG"],
  alternates: { canonical: "https://www.pixores.com/remove-background" },
};

export default function RemoveBackgroundLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
