const originalTemplates = [
  {
    id: "youtube-breaking-news-pro",
    name: "Breaking News Pro",
    category: "YouTube",
    preview: "/templates/youtube-breaking-news.webp",
    width: 1280,
    height: 720,
    canvas: {
      background: "#111827",
      elements: [
        { type: "image", name: "Presenter", src: "/template-assets/people/business-man.png", x: 76, y: 55, width: 360, height: 520 },
        { type: "image", name: "Red Arrow", src: "/template-assets/objects/red-arrow.png", x: 55, y: 48, width: 140, height: 140 },
        { type: "text", text: "BREAKING", x: 28, y: 35, fontSize: 110, color: "#ef4444", fontWeight: "bold" },
        { type: "text", text: "NEWS", x: 28, y: 57, fontSize: 150, color: "#ffffff", fontWeight: "bold" },
      ],
    },
  },

  {
    id: "youtube-shock-pro",
    name: "Shock Reaction Pro",
    category: "YouTube",
    preview: "/templates/youtube-shock.webp",
    width: 1280,
    height: 720,
    canvas: {
      background: "#7f1d1d",
      elements: [
        { type: "image", name: "Shocked Man", src: "/template-assets/people/shocked-man.png", x: 76, y: 55, width: 380, height: 540 },
        { type: "image", name: "Yellow Arrow", src: "/template-assets/objects/yellow-arrow.png", x: 55, y: 50, width: 150, height: 150 },
        { type: "text", text: "NO WAY!", x: 30, y: 36, fontSize: 135, color: "#ffffff", fontWeight: "bold" },
        { type: "text", text: "THIS HAPPENED", x: 35, y: 58, fontSize: 78, color: "#facc15", fontWeight: "bold" },
      ],
    },
  },

  {
    id: "youtube-money-pro",
    name: "Make Money Pro",
    category: "YouTube",
    preview: "/templates/youtube-money.webp",
    width: 1280,
    height: 720,
    canvas: {
      background: "#052e16",
      elements: [
        { type: "image", name: "Business Man", src: "/template-assets/people/business-man.png", x: 78, y: 55, width: 360, height: 520 },
        { type: "image", name: "Money Stack", src: "/template-assets/objects/money-stack.png", x: 58, y: 70, width: 220, height: 220 },
        { type: "text", text: "$1,000", x: 30, y: 40, fontSize: 145, color: "#22c55e", fontWeight: "bold" },
        { type: "text", text: "PER DAY", x: 30, y: 62, fontSize: 90, color: "#ffffff", fontWeight: "bold" },
      ],
    },
  },

  {
    id: "youtube-podcast-pro",
    name: "Podcast Pro",
    category: "YouTube",
    preview: "/templates/youtube-podcast.webp",
    width: 1280,
    height: 720,
    canvas: {
      background: "#18181b",
      elements: [
        { type: "image", name: "Podcast Host", src: "/template-assets/people/podcast-host.png", x: 76, y: 55, width: 380, height: 540 },
        { type: "image", name: "Microphone", src: "/template-assets/objects/microphone.png", x: 58, y: 42, width: 140, height: 140 },
        { type: "text", text: "NEW", x: 27, y: 35, fontSize: 120, color: "#ffffff", fontWeight: "bold" },
        { type: "text", text: "PODCAST", x: 36, y: 58, fontSize: 130, color: "#f97316", fontWeight: "bold" },
      ],
    },
  },

  {
    id: "youtube-gaming-pro",
    name: "Gaming Pro",
    category: "YouTube",
    preview: "/templates/youtube-gaming.webp",
    width: 1280,
    height: 720,
    canvas: {
      background: "#312e81",
      elements: [
        { type: "image", name: "Gamer", src: "/template-assets/people/gamer.png", x: 76, y: 55, width: 390, height: 540 },
        { type: "image", name: "Fire", src: "/template-assets/objects/fire.png", x: 58, y: 62, width: 150, height: 150 },
        { type: "text", text: "EPIC", x: 28, y: 36, fontSize: 140, color: "#facc15", fontWeight: "bold" },
        { type: "text", text: "WIN!", x: 28, y: 60, fontSize: 160, color: "#ffffff", fontWeight: "bold" },
      ],
    },
  },
];

const platformSpecs = [
  { slug: "youtube", category: "YouTube", width: 1280, height: 720, square: false, titleSize: 112, subtitleSize: 82 },
  { slug: "instagram", category: "Instagram", width: 1080, height: 1080, square: true, titleSize: 104, subtitleSize: 74 },
  { slug: "facebook", category: "Facebook", width: 1200, height: 630, square: false, titleSize: 98, subtitleSize: 70 },
] as const;

const themeSpecs = {
  business: {
    name: "Business Growth",
    background: "#e2e8f0",
    titleColor: "#0f2747",
    accentColor: "#2563eb",
    strokeColor: "#ffffff",
    copy: {
      youtube: ["GROW YOUR", "BUSINESS"],
      instagram: ["LEVEL UP", "YOUR BRAND"],
      facebook: ["SMART BUSINESS", "BIG RESULTS"],
    },
  },
  valentine: {
    name: "Valentine Special",
    background: "#7f1d1d",
    titleColor: "#ffffff",
    accentColor: "#fecdd3",
    strokeColor: "#881337",
    copy: {
      youtube: ["PERFECT", "VALENTINE"],
      instagram: ["LOVE IS", "IN THE AIR"],
      facebook: ["VALENTINE SALE", "SAVE 30%"],
    },
  },
  gaming: {
    name: "Gaming Stream",
    background: "#020617",
    titleColor: "#ffffff",
    accentColor: "#22d3ee",
    strokeColor: "#020617",
    copy: {
      youtube: ["EPIC", "GAMING"],
      instagram: ["GAME NIGHT", "LIVE NOW"],
      facebook: ["JOIN THE", "BATTLE"],
    },
  },
  sports: {
    name: "Sports Action",
    background: "#071426",
    titleColor: "#ffffff",
    accentColor: "#a3e635",
    strokeColor: "#071426",
    copy: {
      youtube: ["MATCH DAY", "TOP HIGHLIGHTS"],
      instagram: ["GAME ON", "NEVER QUIT"],
      facebook: ["FINAL", "SHOWDOWN"],
    },
  },
} as const;

const themedTemplates = Object.entries(themeSpecs).flatMap(([themeId, theme]) =>
  platformSpecs.map((platform) => {
    const copy = theme.copy[platform.slug];
    const textWidth = platform.square ? 680 : Math.round(platform.width * 0.48);
    const previewThemeId = themeId === "gaming" ? "gaming-stream" : themeId;

    return {
      id: `${platform.slug}-${themeId}-collection`,
      name: `${theme.name} - ${platform.category}`,
      category: platform.category,
      preview: `/templates/${platform.slug}-${previewThemeId}.webp`,
      width: platform.width,
      height: platform.height,
      canvas: {
        background: theme.background,
        elements: [
          {
            type: "image",
            name: `${theme.name} Background`,
            src: `/template-assets/backgrounds/${themeId}-${platform.square ? "square" : "landscape"}.webp`,
            x: 50,
            y: 50,
            width: platform.width,
            height: platform.height,
            isLocked: true,
          },
          {
            type: "shape",
            name: "Accent Bar",
            shapeType: "rectangle",
            x: platform.square ? 4 : 3.5,
            y: platform.square ? 35 : 47,
            width: platform.square ? 18 : 16,
            height: platform.square ? 235 : 190,
            color: theme.accentColor,
            borderRadius: 4,
          },
          {
            type: "text",
            name: "Headline",
            text: copy[0],
            x: platform.square ? 36 : 28,
            y: platform.square ? 27 : 38,
            width: textWidth,
            fontSize: platform.titleSize,
            color: theme.titleColor,
            fontFamily: "Anton",
            fontWeight: "bold",
            textAlign: "left",
            strokeColor: theme.strokeColor,
            strokeWidth: themeId === "business" ? 0 : 2,
            shadowBlur: themeId === "business" ? 0 : 8,
          },
          {
            type: "text",
            name: "Subheadline",
            text: copy[1],
            x: platform.square ? 36 : 28,
            y: platform.square ? 43 : 58,
            width: textWidth,
            fontSize: platform.subtitleSize,
            color: theme.accentColor,
            fontFamily: "Anton",
            fontWeight: "bold",
            textAlign: "left",
            strokeColor: theme.strokeColor,
            strokeWidth: themeId === "business" ? 0 : 2,
            shadowBlur: themeId === "business" ? 0 : 8,
          },
        ],
      },
    };
  }),
);

export const templates = [...originalTemplates, ...themedTemplates];
