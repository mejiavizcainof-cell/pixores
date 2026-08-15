import type { Metadata } from "next";
import PresentationMaker from "@/components/PresentationMaker";
import ToolSeo from "@/components/ToolSeo";

export const metadata: Metadata = {
  title: "Presentation Maker with Modern Templates",
  description: "Create, edit, present, and export modern widescreen presentations with Pixores Presentation Maker.",
  alternates: { canonical: "https://www.pixores.com/presentation-maker" },
};

export default function PresentationMakerPage() {
  return (
    <main>
      <PresentationMaker />
      <ToolSeo
        tool="presentation-maker"
        title="How to Create and Verify an Editable Presentation"
        description="Build a focused 16:9 deck, save a reusable project, export an editable PowerPoint file, and review fonts, layout, images, and contrast before presenting."
      />
    </main>
  );
}
