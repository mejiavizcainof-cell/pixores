import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const iconPath = path.join(publicDir, "logo.png");
const wordmarkSourcePath = path.join(root, "desktop", "assets", "pixores-wordmark-source.png");

const wordCrop = { left: 580, top: 330, width: 1120, height: 230 };
const { data: sourcePixels, info } = await sharp(wordmarkSourcePath)
  .extract(wordCrop)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function createTransparentWordPixels(lightText) {
  const pixels = Buffer.alloc(info.width * info.height * 4);
  for (let sourceOffset = 0, targetOffset = 0; sourceOffset < sourcePixels.length; sourceOffset += 3, targetOffset += 4) {
    const red = sourcePixels[sourceOffset];
    const green = sourcePixels[sourceOffset + 1];
    const blue = sourcePixels[sourceOffset + 2];
    const distanceFromWhite = Math.max(255 - red, 255 - green, 255 - blue);
    const alphaRatio = Math.max(0, Math.min(1, (distanceFromWhite - 2) / 225));

    if (alphaRatio <= 0.01) continue;

    const unmatte = (channel) => clampChannel((channel - 255 * (1 - alphaRatio)) / alphaRatio);
    const foreground = { red: unmatte(red), green: unmatte(green), blue: unmatte(blue) };
    const isBlueAccent = foreground.blue > 115 && foreground.blue > foreground.red * 1.45;
    const output = isBlueAccent
      ? foreground
      : lightText
        ? { red: 239, green: 246, blue: 255 }
        : { red: 4, green: 18, blue: 48 };

    pixels[targetOffset] = output.red;
    pixels[targetOffset + 1] = output.green;
    pixels[targetOffset + 2] = output.blue;
    pixels[targetOffset + 3] = clampChannel(alphaRatio * 255);
  }
  return pixels;
}

async function createWordmark(lightText, outputName) {
  const icon = await sharp(iconPath)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(200, 200, { fit: "contain" })
    .png()
    .toBuffer();
  const fullWord = await sharp(createTransparentWordPixels(lightText), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ height: 116 })
    .png()
    .toBuffer();

  // The blue symbol is the only P in the horizontal brand. Remove the
  // leading P from the extracted PIXORES word so the final mark reads IXORES.
  const { data: wordPixels, info: wordInfo } = await sharp(fullWord)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const activeColumns = Array.from({ length: wordInfo.width }, (_, x) => {
    for (let y = 0; y < wordInfo.height; y += 1) {
      if (wordPixels[(y * wordInfo.width + x) * 4 + 3] > 24) return true;
    }
    return false;
  });
  const glyphStarts = activeColumns.reduce((starts, active, x) => {
    if (active && !activeColumns[x - 1]) starts.push(x);
    return starts;
  }, []);
  const ixoresStart = glyphStarts[1];
  if (!Number.isInteger(ixoresStart)) throw new Error("Could not isolate IXORES from the brand wordmark.");
  const word = await sharp(fullWord)
    .extract({ left: ixoresStart, top: 0, width: wordInfo.width - ixoresStart, height: wordInfo.height })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const wordMetadata = await sharp(word).metadata();
  const canvasWidth = 236 + Number(wordMetadata.width || 0) + 32;

  await sharp({
    create: { width: canvasWidth, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: icon, left: 16, top: 20 },
      { input: word, left: 236, top: 62 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, outputName));
}

await createWordmark(true, "pixores-logo.png");
await createWordmark(false, "pixores-logo-dark.png");

console.log("Created transparent Pixores wordmarks");
