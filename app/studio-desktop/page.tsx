import type { Metadata } from "next";
import StudioDesktopGate from "@/components/StudioDesktopGate";

export const metadata: Metadata = {
  title: "Pixores Studio Desktop",
  description: "Protected Pixores Studio Desktop workspace for signed-in Pixores users.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioDesktopPage() {
  return <StudioDesktopGate />;
}
