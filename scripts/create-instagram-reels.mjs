import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const root = process.cwd();
const outDir = path.join(root, "output", "social", "reels");
const logoPath = path.join(root, "public", "pixores-logo.png");

const reels = [
  {
    slug: "video-maker-crea-sin-limites",
    image: "scene-video-maker-creator.png",
    label: "PIXORES VIDEO MAKER",
    frames: [
      ["¿TUS IDEAS", "SE QUEDAN SIN EDITAR?", "Convierte clips sueltos en una historia."],
      ["CORTA · AÑADE TEXTO", "USA TRANSICIONES", "Todo desde una línea de tiempo clara."],
      ["CREA SIN LÍMITES", "PUBLICA CON CONFIANZA", "Empieza en pixores.com/video-maker"],
    ],
  },
  {
    slug: "video-maker-productos-que-conectan",
    image: "scene-video-maker-business.png",
    label: "PIXORES VIDEO MAKER",
    frames: [
      ["TU PRODUCTO", "MERECE VERSE PROFESIONAL", "Crea videos que conecten con tus clientes."],
      ["FORMATO VERTICAL", "TEXTO · AUDIO · EXPORTACIÓN", "Prepara contenido listo para redes."],
      ["GRABA. EDITA. COMPARTE.", "TODO CON PIXORES", "Descúbrelo en pixores.com/video-maker"],
    ],
  },
  {
    slug: "thumbnail-creator-gana-el-clic",
    image: "scene-thumbnail-creator-designer.png",
    label: "PIXORES THUMBNAIL CREATOR",
    frames: [
      ["LA MINIATURA", "DECIDE EL CLIC", "Haz que tu contenido destaque primero."],
      ["CAPAS · TIPOGRAFÍAS", "FONDOS Y FORMAS", "Controla cada detalle de tu diseño."],
      ["DISEÑA PARA DESTACAR", "EXPORTA EN PNG", "Crea en pixores.com/youtube-thumbnail-maker"],
    ],
  },
  {
    slug: "thumbnail-creator-portadas-que-destacan",
    image: "scene-thumbnail-creator-camera.png",
    label: "PIXORES THUMBNAIL CREATOR",
    frames: [
      ["UN GRAN VIDEO", "NECESITA UNA GRAN PORTADA", "Captura la atención desde el primer vistazo."],
      ["TU FOTO. TU ESTILO.", "TU MARCA.", "Combina imágenes, texto y color con libertad."],
      ["CREA TU PRÓXIMA", "THUMBNAIL EN PIXORES", "Empieza hoy en pixores.com"],
    ],
  },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function textSvg({ label, line1, line2, subtitle, index }) {
  const top = index === 0 ? 210 : 195;
  const longestLine = Math.max(line1.length, line2.length);
  const titleSize = longestLine > 27 ? 48 : longestLine > 22 ? 54 : 62;
  const subtitleSize = subtitle.length > 48 ? 39 : 43;
  return Buffer.from(`
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#06152a" stop-opacity="0.90"/>
        <stop offset="0.43" stop-color="#07152b" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#020814" stop-opacity="0.72"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#00d5ff"/><stop offset="1" stop-color="#2563ff"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000" flood-opacity="0.65"/></filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#shade)"/>
    <rect x="70" y="${top - 60}" width="${Math.min(760, 40 + label.length * 21)}" height="54" rx="27" fill="#071a34" fill-opacity="0.92" stroke="#22d3ee" stroke-width="2"/>
    <text x="96" y="${top - 23}" fill="#7ddfff" font-family="Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="2">${escapeXml(label)}</text>
    <rect x="70" y="${top + 12}" width="125" height="10" rx="5" fill="url(#accent)"/>
    <text x="70" y="${top + 115}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-2" filter="url(#shadow)">${escapeXml(line1)}</text>
    <text x="70" y="${top + 205}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-2" filter="url(#shadow)">${escapeXml(line2)}</text>
    <text x="70" y="${top + 285}" fill="#dbeafe" font-family="Arial, sans-serif" font-size="${subtitleSize}" font-weight="600" filter="url(#shadow)">${escapeXml(subtitle)}</text>
    <rect x="70" y="1645" width="940" height="112" rx="34" fill="#06152a" fill-opacity="0.88" stroke="#1d4ed8" stroke-width="2"/>
    <circle cx="120" cy="1701" r="13" fill="#22d3ee"/>
    <text x="150" y="1715" fill="#ffffff" font-family="Arial, sans-serif" font-size="38" font-weight="800">Crea hoy con Pixores</text>
    <text x="70" y="1825" fill="#93c5fd" font-family="Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="4">DESLIZA TU IDEA HACIA ADELANTE</text>
  </svg>`);
}

async function renderFrame(reel, frameIndex) {
  const sourcePath = path.join(outDir, reel.image);
  const [line1, line2, subtitle] = reel.frames[frameIndex];
  const background = await sharp(sourcePath)
    .resize(1080, 1920, { fit: "cover", position: "centre" })
    .modulate({ saturation: 0.94, brightness: 0.90 })
    .png()
    .toBuffer();
  const logo = await sharp(logoPath).resize({ width: 310 }).png().toBuffer();
  const framePath = path.join(outDir, `${reel.slug}-frame-${frameIndex + 1}.png`);
  await sharp(background)
    .composite([
      { input: textSvg({ label: reel.label, line1, line2, subtitle, index: frameIndex }), top: 0, left: 0 },
      { input: logo, top: 1780, left: 700 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(framePath);
  return framePath;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.slice(-4000))));
  });
}

async function renderReel(reel) {
  const frames = await Promise.all(reel.frames.map((_, index) => renderFrame(reel, index)));
  const output = path.join(outDir, `${reel.slug}.mp4`);
  const args = ["-y"];
  for (const frame of frames) args.push("-loop", "1", "-t", "3.4", "-i", frame);
  args.push(
    "-filter_complex",
    "[0:v]scale=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':d=102:s=1080x1920:fps=30,format=yuv420p[v0];" +
    "[1:v]scale=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':x='iw-iw/zoom':d=102:s=1080x1920:fps=30,format=yuv420p[v1];" +
    "[2:v]scale=1080:1920,zoompan=z='min(zoom+0.0008,1.08)':x='(iw-iw/zoom)/2':d=102:s=1080x1920:fps=30,format=yuv420p[v2];" +
    "[v0][v1]xfade=transition=fade:duration=0.4:offset=3.0[x1];" +
    "[x1][v2]xfade=transition=fade:duration=0.4:offset=6.0[v]",
    "-map", "[v]", "-t", "9.0", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
  );
  await runFfmpeg(args);
  return output;
}

await fs.mkdir(outDir, { recursive: true });
const outputs = [];
for (const reel of reels) outputs.push(await renderReel(reel));
console.log(outputs.join("\n"));
