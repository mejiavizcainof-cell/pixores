import type { Metadata } from "next";
import FaqExperience from "@/components/FaqExperience";

export const metadata: Metadata = {
  title: "FAQ - Pixores Help Center",
  description: "Find answers about Pixores image tools, file privacy, accounts, mobile support, exports, templates, and AI features.",
  alternates: { canonical: "https://www.pixores.com/faq" },
};

export default function FAQPage() {
  return <FaqExperience />;
}
