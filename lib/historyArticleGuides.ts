export type HistoryArticleGuide = {
  updatedAt: string;
  eyebrow: string;
  answerTitle: string;
  answer: string;
  facts: Array<{ label: string; value: string }>;
  nextSteps: Array<{ href: string; label: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export const historyArticleGuides: Record<string, HistoryArticleGuide> = {
  "history-of-png": {
    updatedAt: "2026-08-15",
    eyebrow: "PNG origin: the short answer",
    answerTitle: "When was PNG invented, and who created it?",
    answer:
      "PNG was conceived in late 1994 as an open, patent-conscious replacement for GIF. Thomas Boutell coordinated the first specification with an international group of developers, and PNG 1.0 became a W3C Recommendation in October 1996.",
    facts: [
      { label: "Project began", value: "Late 1994" },
      { label: "PNG 1.0", value: "October 1996" },
      { label: "Lead coordinator", value: "Thomas Boutell" },
      { label: "Original goal", value: "Open lossless web graphics" },
    ],
    nextSteps: [
      {
        href: "/research/image-format-timeline",
        label: "Explore the image-format timeline",
        description: "Compare the origin, capabilities, and primary specifications of PNG, GIF, JPEG, WebP, and AVIF.",
      },
      {
        href: "/jpg-to-png",
        label: "Convert JPG to PNG",
        description: "Create a PNG delivery copy in the browser without installing software.",
      },
      {
        href: "/png-to-webp",
        label: "Convert PNG to WebP",
        description: "Test a smaller modern delivery format while keeping the original PNG master.",
      },
    ],
    faqs: [
      {
        question: "When was PNG invented?",
        answer:
          "The PNG project began in late 1994. PNG 1.0 became a W3C Recommendation in October 1996.",
      },
      {
        question: "Who created PNG?",
        answer:
          "PNG was a community project. Thomas Boutell coordinated the initial specification, with contributions from an international group of developers.",
      },
      {
        question: "Why was PNG created?",
        answer:
          "Developers wanted an openly specified, lossless replacement for GIF that avoided LZW patent concerns and supported richer color, integrity checks, and alpha transparency.",
      },
    ],
  },
  "history-of-gif": {
    updatedAt: "2026-08-15",
    eyebrow: "GIF history: the short answer",
    answerTitle: "When was GIF invented, and what changed in GIF89a?",
    answer:
      "CompuServe introduced GIF87a in 1987 through a team led by Steve Wilhite. GIF89a followed in 1989 and added control information used for timing, transparency, comments, and application extensions; browser looping became popular later.",
    facts: [
      { label: "GIF87a", value: "1987" },
      { label: "GIF89a", value: "1989" },
      { label: "Created at", value: "CompuServe" },
      { label: "Lead engineer", value: "Steve Wilhite" },
    ],
    nextSteps: [
      {
        href: "/research/image-format-timeline",
        label: "Compare image-format history",
        description: "Use the downloadable timeline to compare GIF with PNG, JPEG, WebP, and AVIF.",
      },
      {
        href: "/blog/history-of-png",
        label: "Why PNG followed GIF",
        description: "See how the patent dispute and GIF's technical limits helped launch PNG.",
      },
      {
        href: "/blog/best-image-format-for-social-media",
        label: "Choose a format for social media",
        description: "Compare practical delivery choices for still images and short visual content.",
      },
    ],
    faqs: [
      {
        question: "When was GIF invented?",
        answer: "CompuServe released the original GIF87a specification in 1987. GIF89a followed in 1989.",
      },
      {
        question: "Who created GIF?",
        answer: "Steve Wilhite led the CompuServe engineering team that developed the Graphics Interchange Format.",
      },
      {
        question: "What is the difference between GIF87a and GIF89a?",
        answer:
          "GIF89a added graphic-control information, delay timing, transparency indication, comments, and application extensions to the earlier GIF87a format.",
      },
    ],
  },
  "history-of-photoshop-image-editing": {
    updatedAt: "2026-08-15",
    eyebrow: "Photoshop history: the short answer",
    answerTitle: "Who created Photoshop, and when was it invented?",
    answer:
      "Brothers Thomas and John Knoll created Photoshop. Thomas began the grayscale-display program Display in 1987, John encouraged its expansion into an editor, Adobe licensed it in 1988, and Photoshop 1.0 shipped for Macintosh in 1990.",
    facts: [
      { label: "First prototype", value: "Display, 1987" },
      { label: "Creators", value: "Thomas and John Knoll" },
      { label: "Adobe license", value: "1988" },
      { label: "Photoshop 1.0", value: "1990" },
    ],
    nextSteps: [
      {
        href: "/remove-background",
        label: "Remove an image background",
        description: "Complete a focused editing task without opening a full professional suite.",
      },
      {
        href: "/crop-image",
        label: "Crop an image precisely",
        description: "Prepare a clean composition and export it directly in the browser.",
      },
      {
        href: "/blog/first-image-editors-history",
        label: "See the editors that came before Photoshop",
        description: "Trace raster paint systems and early digital editing before 1990.",
      },
    ],
    faqs: [
      {
        question: "Who created Photoshop?",
        answer:
          "Thomas and John Knoll created the original program. Thomas wrote the early display and processing code, while John helped shape it into a broader image editor.",
      },
      {
        question: "When was Photoshop invented?",
        answer:
          "The project began as Display in 1987. Adobe licensed it in 1988, and Photoshop 1.0 shipped in 1990.",
      },
      {
        question: "Did Photoshop 1.0 have layers?",
        answer: "No. Persistent layers arrived with Photoshop 3.0 in 1994.",
      },
    ],
  },
};

