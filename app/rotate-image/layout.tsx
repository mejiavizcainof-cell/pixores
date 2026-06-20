import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate and Flip Image Online",
  description: "Correct photo orientation, rotate JPG, PNG and WebP images, or flip them horizontally and vertically online.",
  alternates: { canonical: "https://www.pixores.com/rotate-image" },
};

export default function RotateImageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
