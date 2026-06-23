import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const templates = [
  { slug: "smart-money", eyebrow: "SMART FINANCE", lines: ["MASTER YOUR", "MONEY"], accent: "#facc15", second: "#facc15", titleSize: 92, subtitleSize: 122 },
  { slug: "truth-exposed", eyebrow: "WHAT THEY MISSED", lines: ["THE TRUTH", "REVEALED"], accent: "#f97316", second: "#f97316", titleSize: 104, subtitleSize: 100 },
  { slug: "ai-tools", eyebrow: "WORK SMARTER", lines: ["BEST FREE", "AI TOOLS"], accent: "#a3e635", second: "#a3e635", titleSize: 106, subtitleSize: 112 },
  { slug: "breaking-world", eyebrow: "JUST IN", lines: ["BREAKING", "UPDATE"], accent: "#ef4444", second: "#ffffff", titleSize: 108, subtitleSize: 120 },
  { slug: "thumbnail-design", eyebrow: "CREATE BETTER", lines: ["THUMBNAILS", "THAT CLICK"], accent: "#facc15", first: "#ffffff", second: "#facc15", titleSize: 82, subtitleSize: 94, strokeWidth: 3 },
  { slug: "financial-freedom", eyebrow: "BUILD THE PLAN", lines: ["FINANCIAL", "FREEDOM"], accent: "#facc15", second: "#facc15", titleSize: 94, subtitleSize: 98 },
  { slug: "mystery-facts", eyebrow: "YOU NEVER KNEW", lines: ["MYSTERY", "FACTS"], accent: "#fb923c", second: "#fb923c", titleSize: 108, subtitleSize: 130 },
  { slug: "ai-experiment", eyebrow: "I TESTED IT", lines: ["THIS AI", "CHANGED IT"], accent: "#22d3ee", second: "#f472b6", titleSize: 118, subtitleSize: 88 },
  { slug: "top-tools", eyebrow: "CREATOR PICKS", lines: ["TOP TOOLS", "YOU NEED"], accent: "#f97316", second: "#facc15", titleSize: 102, subtitleSize: 106 },
  { slug: "business-growth", eyebrow: "THE SIMPLE SYSTEM", lines: ["GROW YOUR", "BUSINESS"], accent: "#22d3ee", second: "#22d3ee", titleSize: 100, subtitleSize: 102 },
];

const escapeXml = (value) => value.replace(/[<>&'\"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
})[character]);

await Promise.all(templates.map(async (template) => {
  const strokeWidth = template.strokeWidth ?? 4;
  const overlay = Buffer.from(`
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="245" width="14" height="270" rx="5" fill="${template.accent}" />
      <rect x="74" y="168" width="275" height="48" rx="6" fill="#020617" fill-opacity="0.82" />
      <text x="92" y="202" fill="${template.accent}" font-family="Arial, sans-serif" font-size="27" font-weight="800" letter-spacing="1">${escapeXml(template.eyebrow)}</text>
      <text x="76" y="354" fill="${template.first ?? "#ffffff"}" stroke="#020617" stroke-width="${strokeWidth}" paint-order="stroke" font-family="Arial Black, Impact, sans-serif" font-size="${template.titleSize}" font-weight="900">${escapeXml(template.lines[0])}</text>
      <text x="76" y="486" fill="${template.second}" stroke="#020617" stroke-width="${strokeWidth}" paint-order="stroke" font-family="Arial Black, Impact, sans-serif" font-size="${template.subtitleSize}" font-weight="900">${escapeXml(template.lines[1])}</text>
    </svg>
  `);

  const background = path.join(root, "public", "template-assets", "backgrounds", `creator-${template.slug}.webp`);
  const output = path.join(root, "public", "templates", `youtube-creator-${template.slug}.webp`);

  await sharp(background)
    .resize(1280, 720, { fit: "cover" })
    .composite([{ input: overlay }])
    .webp({ quality: 86, effort: 5 })
    .toFile(output);
}));

console.log(`Generated ${templates.length} creator template previews.`);
