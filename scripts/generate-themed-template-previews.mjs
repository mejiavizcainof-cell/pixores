import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const platforms = [
  { slug: "youtube", width: 1280, height: 720, square: false, titleSize: 112, subtitleSize: 82 },
  { slug: "instagram", width: 1080, height: 1080, square: true, titleSize: 104, subtitleSize: 74 },
  { slug: "facebook", width: 1200, height: 630, square: false, titleSize: 98, subtitleSize: 70 },
];

const themes = {
  business: {
    titleColor: "#0f2747",
    accentColor: "#2563eb",
    strokeColor: "#ffffff",
    copy: { youtube: ["GROW YOUR", "BUSINESS"], instagram: ["LEVEL UP", "YOUR BRAND"], facebook: ["SMART BUSINESS", "BIG RESULTS"] },
  },
  valentine: {
    titleColor: "#ffffff",
    accentColor: "#fecdd3",
    strokeColor: "#881337",
    copy: { youtube: ["PERFECT", "VALENTINE"], instagram: ["LOVE IS", "IN THE AIR"], facebook: ["VALENTINE SALE", "SAVE 30%"] },
  },
  gaming: {
    titleColor: "#ffffff",
    accentColor: "#22d3ee",
    strokeColor: "#020617",
    copy: { youtube: ["EPIC", "GAMING"], instagram: ["GAME NIGHT", "LIVE NOW"], facebook: ["JOIN THE", "BATTLE"] },
  },
  sports: {
    titleColor: "#ffffff",
    accentColor: "#a3e635",
    strokeColor: "#071426",
    copy: { youtube: ["MATCH DAY", "TOP HIGHLIGHTS"], instagram: ["GAME ON", "NEVER QUIT"], facebook: ["FINAL", "SHOWDOWN"] },
  },
};

const escapeXml = (value) => value.replace(/[<>&'\"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
})[character]);

const jobs = Object.entries(themes).flatMap(([themeId, theme]) =>
  platforms.map(async (platform) => {
    const [title, subtitle] = theme.copy[platform.slug];
    const x = Math.round(platform.width * (platform.square ? 0.085 : 0.07));
    const titleY = Math.round(platform.height * (platform.square ? 0.29 : 0.42));
    const subtitleY = Math.round(platform.height * (platform.square ? 0.43 : 0.63));
    const barY = Math.round(platform.height * (platform.square ? 0.18 : 0.27));
    const barHeight = Math.round(platform.height * (platform.square ? 0.31 : 0.43));
    const strokeWidth = themeId === "business" ? 0 : 3;
    const previewThemeId = themeId === "gaming" ? "gaming-stream" : themeId;

    const overlay = Buffer.from(`
      <svg width="${platform.width}" height="${platform.height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${Math.round(platform.width * 0.035)}" y="${barY}" width="${Math.max(14, Math.round(platform.width * 0.012))}" height="${barHeight}" rx="4" fill="${theme.accentColor}" />
        <text x="${x}" y="${titleY}" fill="${theme.titleColor}" stroke="${theme.strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke" font-family="Arial Black, Impact, sans-serif" font-size="${platform.titleSize}" font-weight="900">${escapeXml(title)}</text>
        <text x="${x}" y="${subtitleY}" fill="${theme.accentColor}" stroke="${theme.strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke" font-family="Arial Black, Impact, sans-serif" font-size="${platform.subtitleSize}" font-weight="900">${escapeXml(subtitle)}</text>
      </svg>
    `);

    const background = path.join(root, "public", "template-assets", "backgrounds", `${themeId}-${platform.square ? "square" : "landscape"}.webp`);
    const output = path.join(root, "public", "templates", `${platform.slug}-${previewThemeId}.webp`);

    await sharp(background)
      .resize(platform.width, platform.height, { fit: "cover" })
      .composite([{ input: overlay }])
      .webp({ quality: 86, effort: 5 })
      .toFile(output);
  }),
);

await Promise.all(jobs);
console.log(`Generated ${jobs.length} themed template previews.`);
