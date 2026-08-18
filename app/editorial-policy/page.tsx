import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Editorial Policy and Review Standards",
  description: "Learn how Pixores creates, reviews, updates, sources, and corrects practical image and creator-tool guidance.",
  alternates: { canonical: "https://www.pixores.com/editorial-policy" },
};

const sections = [
  {
    id: "purpose",
    title: "Purpose and scope",
    content: <><p>Pixores publishes practical guidance about image formats, image preparation, thumbnails, creator workflows, and the tools available on this site. Each guide should help a visitor complete a real task, understand an important limitation, or make a better-informed format or workflow decision.</p><p>We remove or consolidate pages when several URLs answer the same question without adding a distinct practical contribution. Publication volume is not an editorial goal.</p></>,
  },
  {
    id: "responsibility",
    title: "Who is responsible",
    content: <><p>Articles are published by the <strong>Pixores Editorial Team</strong>. This organizational byline is used because the guidance is maintained as part of the product rather than attributed to a guest author. Pixores remains responsible for the final published text, corrections, links, and product claims.</p><p>Questions about a guide can be sent through the <Link href="/contact">contact page</Link> or to <a href="mailto:support@pixores.com">support@pixores.com</a>. A future article will not be assigned to a named person unless that person actually wrote or reviewed it and has agreed to the attribution.</p></>,
  },
  {
    id: "process",
    title: "How guides are produced",
    content: <><p>We begin with the user task and inspect the current Pixores interface and implementation. Tool pages document the formats, limits, processing location, output behavior, and tradeoffs that exist in the product at the stated review date.</p><p>Research-based claims should rely on primary documentation from standards bodies, platform owners, browser vendors, or the organization responsible for a format or feature. External sources are linked near the relevant claim when a visitor may need to confirm a changing requirement.</p><p>Pixores may use software automation or AI-assisted tools for outlining, drafting, consistency checks, or code-aware review. These tools do not own the editorial decision. Material produced with assistance must still be checked for unsupported claims, duplicated passages, relevance, and consistency with the functioning product before publication.</p></>,
  },
  {
    id: "testing",
    title: "Product testing and evidence",
    content: <><p>We distinguish documented behavior from measured results. A tool guide may state an encoder setting, supported format, output limit, or local-versus-server processing path when that behavior is verified in the current product. We do not present invented benchmarks, testimonials, traffic results, or quality comparisons as tests.</p><p>When an article reports a comparison or experiment, it should identify the source files, settings, evaluation method, and date closely enough for another person to understand the result. Visual judgments are described as judgments rather than universal facts.</p></>,
  },
  {
    id: "accuracy",
    title: "Accuracy, limitations, and safety",
    content: <><p>Guides should explain important failure modes rather than promise perfect output. Examples include transparency loss during JPG conversion, generated detail during AI upscaling, difficult edges during background removal, and the limited protective effect of watermarks.</p><p>Pixores does not publish professional medical, legal, or financial advice. Users should preserve original files, confirm destination requirements, respect copyright and privacy, and seek qualified help when an image or document has legal, evidentiary, safety, or financial consequences.</p></>,
  },
  {
    id: "updates",
    title: "Updates and corrections",
    content: <><p>Every tool guide displays a review date. A substantive change to tool behavior, a platform requirement, or a documented error should trigger another review. Dates are not changed merely to make an unchanged page appear fresh.</p><p>Confirmed errors are corrected in the article. If a page no longer provides a distinct useful answer, it may be merged into a stronger guide and permanently redirected, or removed when no honest equivalent exists.</p></>,
  },
  {
    id: "commercial",
    title: "Commercial relationship and advertising",
    content: <><p>Pixores guides may link to Pixores tools because the site develops and operates those tools. We identify their limits and processing behavior alongside their capabilities. Editorial pages are not written as independent third-party reviews of Pixores.</p><p>Advertising, when enabled, should remain separate from navigation and tool controls and should not appear on login, error, private workspace, or other screens without suitable publisher content. Advertising does not determine the conclusions of a guide.</p></>,
  },
];

export default function EditorialPolicyPage() {
  return (
    <PolicyPage
      title="Editorial Policy"
      description="The standards used to create, review, source, update, consolidate, and correct Pixores guides."
      lastUpdated="August 14, 2026"
      notice="Useful guidance comes before publication volume. Pixores documents real product behavior, states meaningful limits, and consolidates pages that do not add a distinct answer."
      sections={sections}
    />
  );
}
