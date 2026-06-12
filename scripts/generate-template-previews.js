const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const templates = [
  ["youtube-breaking-news", "BREAKING", "NEWS", "#111827", "#ef4444", "#ffffff", 1280, 720],
  ["youtube-warning", "DON'T", "DO THIS", "#000000", "#ef4444", "#ffffff", 1280, 720],
  ["youtube-before-after", "BEFORE", "AFTER", "#f8fafc", "#ef4444", "#22c55e", 1280, 720],
  ["youtube-tutorial", "HOW TO", "DO IT", "#1e3a8a", "#ffffff", "#facc15", 1280, 720],
  ["youtube-shock", "NO WAY!", "THIS HAPPENED", "#7f1d1d", "#ffffff", "#facc15", 1280, 720],
  ["youtube-money", "MAKE", "$1,000", "#052e16", "#ffffff", "#22c55e", 1280, 720],
  ["youtube-ai", "AI", "CHANGED THIS", "#020617", "#38bdf8", "#ffffff", 1280, 720],
  ["youtube-gaming", "EPIC", "WIN!", "#312e81", "#facc15", "#ffffff", 1280, 720],
  ["youtube-podcast", "NEW", "PODCAST", "#18181b", "#ffffff", "#f97316", 1280, 720],
  ["youtube-reaction", "MY", "REACTION", "#450a0a", "#ffffff", "#facc15", 1280, 720],
  ["tiktok-viral", "THIS WENT", "VIRAL", "#000000", "#ffffff", "#ef4444", 1080, 1920],
  ["tiktok-storytime", "STORY", "TIME", "#1e1b4b", "#ffffff", "#facc15", 1080, 1920],
  ["tiktok-drama", "DRAMA", "ALERT", "#7f1d1d", "#ffffff", "#facc15", 1080, 1920],
  ["instagram-quote", "YOUR QUOTE", "GOES HERE", "#f8fafc", "#0f172a", "#475569", 1080, 1080],
  ["instagram-sale", "SALE", "50% OFF", "#dc2626", "#ffffff", "#facc15", 1080, 1080],
];

const outputDir = path.join(process.cwd(), "public", "templates");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function createPreview([id, line1, line2, bg, color1, color2, width, height]) {
  const fontSize1 = width === 1080 && height === 1920 ? 130 : 120;
  const fontSize2 = width === 1080 && height === 1920 ? 150 : 150;

  const y1 = height === 1920 ? 650 : height === 1080 ? 420 : 260;
  const y2 = height === 1920 ? 820 : height === 1080 ? 560 : 420;

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    <circle cx="${width - 180}" cy="160" r="130" fill="rgba(255,255,255,0.12)"/>
    <circle cx="${width - 320}" cy="${height - 120}" r="180" fill="rgba(255,255,255,0.08)"/>
    <text x="80" y="${y1}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize1}" font-weight="900" fill="${color1}">${line1}</text>
    <text x="80" y="${y2}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize2}" font-weight="900" fill="${color2}">${line2}</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .webp({ quality: 90 })
    .toFile(path.join(outputDir, `${id}.webp`));

  console.log(`Created: ${id}.webp`);
}

async function run() {
  for (const template of templates) {
    await createPreview(template);
  }
}

run();