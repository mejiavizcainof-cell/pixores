import { mkdir, readdir, stat, writeFile } from "fs/promises";
import path from "path";

const libraryRoot = path.join(process.cwd(), "public", "video-maker-assets");
const manifestPath = path.join(libraryRoot, "library.json");

const titleCase = (value) => value
  .split(/[-_]+/)
  .filter(Boolean)
  .map((word) => word.length <= 3 && word === word.toUpperCase()
    ? word
    : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
  .join(" ");

const soundCreatorPrefixes = [
  "alexzavesa",
  "audiopapkin",
  "audiorezout",
  "brvhrtz",
  "diamond-tunes",
  "freesound-community",
  "gregorquendel",
  "idoberg",
  "rescopicsound",
  "soulprodmusic",
  "soundreality",
  "submority",
  "viralaudio",
  "whitenoisesleepers",
];

const getSoundTitle = (fileName) => {
  const extension = path.extname(fileName);
  let stem = path.basename(fileName, extension).toLowerCase();
  const creator = soundCreatorPrefixes.find((prefix) => stem.startsWith(`${prefix}-`));
  if (creator) stem = stem.slice(creator.length + 1);
  stem = stem
    .replace(/-\d{4,}$/, "")
    .replace(/-(?:sfx|ps)(?=-|$)/g, "")
    .replace(/-(?:short-version)-/g, "-short-")
    .replace(/-0*1$/, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const creatorTail = creator?.split("-").at(-1);
  if (creatorTail && stem.endsWith(`-${creatorTail}`)) stem = stem.slice(0, -(creatorTail.length + 1));
  return titleCase(stem) || "Sound Effect";
};

async function collectFolder(folderName, kind) {
  const folderPath = path.join(libraryRoot, folderName);
  const entries = await readdir(folderPath, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((first, second) => first.localeCompare(second, "en", { numeric: true }));

  return Promise.all(files.map(async (fileName, index) => {
    const filePath = path.join(folderPath, fileName);
    const fileStats = await stat(filePath);
    const extension = path.extname(fileName).toLowerCase();
    const id = `${kind}-${path.basename(fileName, extension)}`;
    return {
      id,
      title: kind === "video-background"
        ? `Video Background ${String(index + 1).padStart(2, "0")}`
        : getSoundTitle(fileName),
      kind: kind === "video-background" ? "video" : "audio",
      category: kind === "video-background" ? "Video Backgrounds" : "Sound Effects",
      path: `${folderName}/${fileName}`,
      mimeType: kind === "video-background" ? "video/mp4" : "audio/mpeg",
      size: fileStats.size,
    };
  }));
}

async function main() {
  const [videoBackgrounds, soundEffects] = await Promise.all([
    collectFolder("video-backgrounds", "video-background"),
    collectFolder("sound-effects", "sound-effect"),
  ]);
  const manifest = {
    schemaVersion: 1,
    videoBackgrounds,
    soundEffects,
  };
  await mkdir(libraryRoot, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Generated ${path.relative(process.cwd(), manifestPath)}`);
}

main();
