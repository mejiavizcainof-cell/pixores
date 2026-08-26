export type ArticleEvidence = {
  title: string;
  purpose: string;
  procedure: string[];
  record: string[];
  passCondition: string;
};

export const articleEvidence: Record<string, ArticleEvidence> = {
  "how-to-create-youtube-thumbnail": {
    title: "The 160-pixel recognition check",
    purpose: "Verify that the thumbnail communicates one honest subject at approximately mobile-feed size.",
    procedure: [
      "Export the finished thumbnail and a second version with one meaningful change.",
      "Display both at 160 pixels wide without showing the video title.",
      "Ask a reviewer to identify the subject, first focal point, and expected video topic.",
    ],
    record: ["Version tested", "First element noticed", "Topic inferred", "Unreadable text or hidden details"],
    passCondition: "A reviewer identifies the intended subject and topic without zooming or relying on a misleading cue.",
  },
  "increase-image-resolution-ai": {
    title: "Equal-display-size upscaling review",
    purpose: "Separate useful enlargement from the illusion created by viewing a larger file fitted to the screen.",
    procedure: [
      "Create a 2x derivative before considering 4x.",
      "Compare source and result at the same displayed dimensions.",
      "Inspect eyes, hands, small text, repeated patterns, and edges at 100 percent.",
    ],
    record: ["Source dimensions", "Scale", "Output dimensions", "Generated or malformed details"],
    passCondition: "The derivative meets the real output size without introducing defects that change the subject or written information.",
  },
  "jpg-vs-png": {
    title: "One-source format comparison",
    purpose: "Choose a format from evidence produced by the actual image instead of a universal rule.",
    procedure: [
      "Export one representative source as JPG and PNG at the required display dimensions.",
      "Compare file size, text and edge clarity, and transparency behavior.",
      "Open both files in the destination workflow before selecting the delivery copy.",
    ],
    record: ["File size", "Dimensions", "Transparency", "Visible artifacts", "Destination compatibility"],
    passCondition: "The selected file preserves the information users need with no unnecessary transfer or compatibility cost.",
  },
  "compress-images-for-website-seo": {
    title: "Production-slot compression check",
    purpose: "Evaluate the derivative where it will actually appear rather than judging only a percentage reduction.",
    procedure: [
      "Resize the source to the largest rendered slot before compression.",
      "Compare the derivative with the master at that rendered size and at 100 percent.",
      "Check text, faces, gradients, and high-contrast edges before publishing.",
    ],
    record: ["Rendered slot", "Source bytes", "Derivative bytes", "Format", "Visible defect notes"],
    passCondition: "The page receives a smaller correctly sized asset whose important details remain acceptable in context.",
  },
  "resize-image-without-stretching": {
    title: "Aspect-ratio calculation check",
    purpose: "Prove that the requested dimensions preserve composition before creating the derivative.",
    procedure: [
      "Divide source width by source height to record the original ratio.",
      "Calculate the missing target dimension from that ratio.",
      "If the destination ratio differs, crop or pad deliberately instead of forcing both dimensions.",
    ],
    record: ["Source dimensions", "Source ratio", "Target ratio", "Crop, pad, or proportional resize decision"],
    passCondition: "Circles remain circular, people are not widened, and the important subject fits the intended placement.",
  },
  "make-transparent-background-png": {
    title: "Three-background edge inspection",
    purpose: "Reveal halos and missing pixels that a transparent checkerboard can hide.",
    procedure: [
      "Place the cutout over white, black, and a saturated color.",
      "Inspect hair, product edges, gaps, reflections, and soft shadows at 100 percent.",
      "Keep the source and repaired transparent PNG as separate files.",
    ],
    record: ["Edge area", "Background color", "Halo or missing pixels", "Correction required"],
    passCondition: "The subject edge remains credible on all three backgrounds used for review.",
  },
  "youtube-thumbnail-ab-testing": {
    title: "Single-variable test record",
    purpose: "Make a thumbnail test explain something instead of comparing unrelated designs.",
    procedure: [
      "Write one hypothesis before creating the alternative.",
      "Change one major variable while keeping dimensions and export quality constant.",
      "Record the platform result together with viewer-satisfaction evidence.",
    ],
    record: ["Video", "Hypothesis", "Variable changed", "Test window", "Result", "Interpretation"],
    passCondition: "The test can be repeated and its conclusion does not depend only on a short traffic spike.",
  },
  "social-media-image-sizes-2026": {
    title: "Placement and safe-area check",
    purpose: "Confirm that one source composition survives the real crop and interface overlays of its destination.",
    procedure: [
      "Create the destination aspect ratio before placing text or faces.",
      "Keep essential elements away from the outer edge and known interface overlays.",
      "Upload a private or draft test and inspect the feed, profile, and expanded view on mobile.",
    ],
    record: ["Platform", "Placement", "Canvas ratio", "Observed crop", "Overlay conflict"],
    passCondition: "The subject and required text remain intact in every intended placement without relying on an automatic crop.",
  },
  "webp-vs-avif-vs-jpeg": {
    title: "Same-source delivery comparison",
    purpose: "Compare codecs with one controlled source, display size, and destination instead of quoting generic savings.",
    procedure: [
      "Resize one photographic master to the largest production slot.",
      "Export JPEG, WebP, and AVIF candidates with documented settings.",
      "Compare bytes and visible artifacts in the browsers and publishing system that will serve the image.",
    ],
    record: ["Encoder and setting", "Bytes", "Browser result", "CMS result", "Artifact notes"],
    passCondition: "The chosen format is supported by the complete delivery path and has no meaningful defect at the rendered size.",
  },
  "thumbnail-color-psychology": {
    title: "Grayscale hierarchy check",
    purpose: "Test whether the focal point depends on real contrast rather than an unsupported claim about a supposedly viral color.",
    procedure: [
      "Review the thumbnail in color at mobile size.",
      "Temporarily convert the composition to grayscale.",
      "Identify the first visible subject and any text that loses separation.",
    ],
    record: ["Dominant subject", "Brightness contrast", "Text separation", "Color-only meaning"],
    passCondition: "The intended hierarchy remains understandable in grayscale and does not depend only on red-versus-green meaning.",
  },
  "best-image-format-for-social-media": {
    title: "Destination acceptance check",
    purpose: "Select a social delivery file from the platform's actual behavior rather than the newest extension.",
    procedure: [
      "Prepare a correctly sized JPG and, when transparency matters, a PNG from the same master.",
      "Upload a private or draft example through the intended publishing workflow.",
      "Inspect recompression, crop, transparency, and text clarity on mobile before publishing the final asset.",
    ],
    record: ["Platform", "Input format", "Input bytes", "Observed recompression", "Crop or transparency result"],
    passCondition: "The platform accepts the file and preserves the intended composition without unnecessary size or lost transparency.",
  },
  "how-to-watermark-images": {
    title: "Representative-set watermark proof",
    purpose: "Prevent a batch rule that works on one image but disappears or dominates on others.",
    procedure: [
      "Select light, dark, portrait, and landscape samples from the intended collection.",
      "Apply one relative size, opacity, and placement rule.",
      "Inspect every sample at final display size before processing the complete set.",
    ],
    record: ["Sample type", "Contrast", "Relative size", "Crop resistance", "Subject obstruction"],
    passCondition: "The mark stays identifiable across the set without hiding the main subject or implying false ownership.",
  },
  "favicon-sizes-guide-2026": {
    title: "Actual-size favicon inspection",
    purpose: "Judge the asset in the smallest real browser context, not only from its 512-pixel master.",
    procedure: [
      "Open the 16- and 32-pixel files at 100 percent zoom.",
      "Check the mark on light and dark browser-like backgrounds.",
      "Verify every declared production URL and the web manifest.",
    ],
    record: ["Asset size", "Background", "Recognizable shape", "Production status", "Manifest reference"],
    passCondition: "The smallest mark remains recognizable and every declared icon returns successfully after deployment.",
  },
};
