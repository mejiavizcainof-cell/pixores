import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const root = process.cwd();
const outDir = path.join(root, "output", "social", "reels");
const workDir = path.join(outDir, "pixores-brand-promo-assets");
const logoPath = path.join(root, "public", "pixores-logo.png");
const voicePath = path.join(workDir, "pixores-brand-promo-voice.wav");
const musicPath = path.join(workDir, "pixores-brand-promo-music.wav");
const outputPath = path.join(outDir, "pixores-tus-ideas-merecen-verse-increibles.mp4");
const previewPath = path.join(outDir, "pixores-tus-ideas-merecen-verse-increibles-preview.jpg");

const narration = [
  "Tus ideas merecen verse increíbles.",
  "Con Pixores puedes editar imágenes, crear miniaturas que detienen el scroll y producir videos listos para publicar.",
  "Todo en un solo lugar: fácil, rápido y pensado para creadores.",
  "Convierte una idea en contenido que conecta.",
  "Crea hoy en Pixores punto com.",
].join(" ");

const scenes = [
  {
    source: path.join(root, "output", "social-media", "pixores-launch", "generated", "01-bienvenidos-a-pixores.png"),
    eyebrow: "CREA CON PIXORES",
    title: ["TUS IDEAS MERECEN", "VERSE INCREÍBLES"],
    caption: "Tus ideas merecen verse increíbles.",
    position: "centre",
  },
  {
    source: path.join(root, "output", "social-media", "pixores-launch", "generated", "05-herramientas-de-imagen.png"),
    eyebrow: "EDICIÓN DE IMÁGENES",
    title: ["EDITA. MEJORA.", "TRANSFORMA."],
    caption: "Edita imágenes con herramientas rápidas y fáciles.",
    position: "centre",
  },
  {
    source: path.join(outDir, "scene-thumbnail-creator-designer.png"),
    eyebrow: "THUMBNAIL CREATOR",
    title: ["DETÉN EL SCROLL", "GANA EL CLIC"],
    caption: "Crea miniaturas que detienen el scroll.",
    position: "centre",
  },
  {
    source: path.join(outDir, "scene-video-maker-creator.png"),
    eyebrow: "VIDEO MAKER",
    title: ["DE TU IDEA", "A UN VIDEO"],
    caption: "Produce videos listos para publicar.",
    position: "centre",
  },
  {
    source: path.join(root, "output", "social-media", "pixores-launch", "generated", "03-quick-video-maker.png"),
    eyebrow: "TODO EN UN SOLO LUGAR",
    title: ["CREA CONTENIDO", "QUE CONECTA"],
    caption: "Crea hoy en Pixores.com",
    position: "centre",
    cta: true,
  },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function overlaySvg(scene, index) {
  const top = index === 0 ? 255 : 205;
  const titleSize = Math.max(...scene.title.map((line) => line.length)) > 20 ? 60 : 68;
  const cta = scene.cta
    ? `<rect x="70" y="1275" width="940" height="120" rx="34" fill="url(#accent)"/>
       <text x="540" y="1352" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="43" font-weight="900">PIXORES.COM</text>`
    : "";
  return Buffer.from(`
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#020817" stop-opacity="0.82"/>
          <stop offset="0.46" stop-color="#06152a" stop-opacity="0.10"/>
          <stop offset="1" stop-color="#020817" stop-opacity="0.88"/>
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#08c7ff"/><stop offset="1" stop-color="#155dfc"/>
        </linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="9" flood-color="#000" flood-opacity="0.72"/></filter>
      </defs>
      <rect width="1080" height="1920" fill="url(#shade)"/>
      <rect x="70" y="${top - 78}" width="${Math.min(790, 70 + scene.eyebrow.length * 24)}" height="58" rx="29" fill="#06152a" fill-opacity="0.94" stroke="#22d3ee" stroke-width="2"/>
      <text x="100" y="${top - 38}" fill="#8be8ff" font-family="Arial, sans-serif" font-size="29" font-weight="800" letter-spacing="2">${escapeXml(scene.eyebrow)}</text>
      <rect x="70" y="${top}" width="145" height="10" rx="5" fill="url(#accent)"/>
      <text x="70" y="${top + 112}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-2" filter="url(#shadow)">${escapeXml(scene.title[0])}</text>
      <text x="70" y="${top + 202}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-2" filter="url(#shadow)">${escapeXml(scene.title[1])}</text>
      ${cta}
      <rect x="60" y="1435" width="960" height="122" rx="32" fill="#020817" fill-opacity="0.90" stroke="#1f65ff" stroke-width="2"/>
      <text x="540" y="1510" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="35" font-weight="750">${escapeXml(scene.caption)}</text>
    </svg>
  `);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.slice(-6000))));
  });
}

async function createVoice() {
  const command = [
    "Add-Type -AssemblyName System.Speech",
    "$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$speaker.SelectVoice('Microsoft Sabina Desktop')",
    "$speaker.Rate = 0",
    "$speaker.Volume = 100",
    `$speaker.SetOutputToWaveFile('${voicePath.replaceAll("'", "''")}')`,
    `$speaker.Speak('${narration.replaceAll("'", "''")}')`,
    "$speaker.Dispose()",
  ].join("; ");
  await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command]);
}

async function createMusic() {
  await run(ffmpegPath, [
    "-y",
    "-f", "lavfi", "-i", "sine=frequency=110:sample_rate=48000:duration=24",
    "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=24",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=24",
    "-filter_complex",
    "[0:a]volume=0.050,tremolo=f=2:d=0.40,lowpass=f=750[a0];" +
      "[1:a]volume=0.018,tremolo=f=4:d=0.65,lowpass=f=1400[a1];" +
      "[2:a]volume=0.008,tremolo=f=8:d=0.75,lowpass=f=2600[a2];" +
      "[a0][a1][a2]amix=inputs=3:normalize=0,afade=t=in:st=0:d=1.2,afade=t=out:st=21:d=2.5[a]",
    "-map", "[a]", "-c:a", "pcm_s16le", musicPath,
  ]);
}

async function renderFrame(scene, index) {
  const base = await sharp(scene.source)
    .resize(1080, 1920, { fit: "cover", position: scene.position })
    .modulate({ brightness: 0.88, saturation: 1.04 })
    .png()
    .toBuffer();
  const logo = await sharp(logoPath).resize({ width: 310 }).png().toBuffer();
  const framePath = path.join(workDir, `scene-${index + 1}.png`);
  await sharp(base)
    .composite([
      { input: overlaySvg(scene, index), top: 0, left: 0 },
      { input: logo, top: 1600, left: 705 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(framePath);
  return framePath;
}

async function renderVideo(frames) {
  const duration = 4.75;
  const fade = 0.45;
  const totalDuration = duration * frames.length - fade * (frames.length - 1);
  const args = ["-y"];
  for (const frame of frames) args.push("-loop", "1", "-t", String(duration), "-i", frame);
  args.push("-i", voicePath, "-i", musicPath);

  const filters = frames.map((_, index) => {
    const x = index % 2 === 0 ? "(iw-iw/zoom)/2" : "iw-iw/zoom";
    return `[${index}:v]scale=1080:1920,zoompan=z='min(zoom+0.0007,1.07)':x='${x}':y='(ih-ih/zoom)/2':d=143:s=1080x1920:fps=30,format=yuv420p[v${index}]`;
  });
  filters.push("[v0][v1]xfade=transition=fade:duration=0.45:offset=4.30[x1]");
  filters.push("[x1][v2]xfade=transition=fade:duration=0.45:offset=8.60[x2]");
  filters.push("[x2][v3]xfade=transition=fade:duration=0.45:offset=12.90[x3]");
  filters.push("[x3][v4]xfade=transition=fade:duration=0.45:offset=17.20[vout]");
  filters.push(`[5:a]volume=1.0,apad=pad_dur=${totalDuration}[voice]`);
  filters.push(`[6:a]volume=0.85,atrim=0:${totalDuration}[music]`);
  filters.push("[voice][music]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.94[aout]");

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-t", String(totalDuration), "-r", "30",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
    outputPath,
  );
  await run(ffmpegPath, args);
  await run(ffmpegPath, ["-y", "-ss", "2.0", "-i", outputPath, "-frames:v", "1", "-q:v", "2", previewPath]);
}

await fs.mkdir(workDir, { recursive: true });
await Promise.all([createVoice(), createMusic()]);
const frames = await Promise.all(scenes.map(renderFrame));
await renderVideo(frames);

console.log(JSON.stringify({ video: outputPath, preview: previewPath, voice: voicePath, music: musicPath }, null, 2));
