export const templates = [
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