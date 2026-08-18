import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "desktop", "assets");
const sourcePath = path.join(outDir, "pixores-icon-source.png");
const pngPath = path.join(outDir, "icon.png");
const icoPath = path.join(outDir, "icon.ico");
const publicDir = path.join(process.cwd(), "public");
const appDir = path.join(process.cwd(), "app");

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });

const source = sharp(sourcePath).rotate();
const pngBuffer = await source.clone().resize(512, 512, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
const icoPngBuffer = await source.clone().resize(256, 256, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
await fs.writeFile(pngPath, pngBuffer);
await fs.writeFile(path.join(publicDir, "logo.png"), pngBuffer);
await fs.writeFile(path.join(publicDir, "favicon-16x16.png"), await source.clone().resize(16, 16, { fit: "cover" }).png().toBuffer());
await fs.writeFile(path.join(publicDir, "favicon-32x32.png"), await source.clone().resize(32, 32, { fit: "cover" }).png().toBuffer());
await fs.writeFile(path.join(publicDir, "apple-touch-icon.png"), await source.clone().resize(180, 180, { fit: "cover" }).png().toBuffer());
await fs.writeFile(path.join(publicDir, "android-chrome-192x192.png"), await source.clone().resize(192, 192, { fit: "cover" }).png().toBuffer());
await fs.writeFile(path.join(publicDir, "android-chrome-512x512.png"), pngBuffer);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const directory = Buffer.alloc(16);
directory.writeUInt8(0, 0);
directory.writeUInt8(0, 1);
directory.writeUInt8(0, 2);
directory.writeUInt8(0, 3);
directory.writeUInt16LE(1, 4);
directory.writeUInt16LE(32, 6);
directory.writeUInt32LE(icoPngBuffer.length, 8);
directory.writeUInt32LE(header.length + directory.length, 12);

const icoBuffer = Buffer.concat([header, directory, icoPngBuffer]);
await fs.writeFile(icoPath, icoBuffer);
await fs.writeFile(path.join(publicDir, "favicon.ico"), icoBuffer);
await fs.writeFile(path.join(appDir, "favicon.ico"), icoBuffer);

console.log(`Created ${icoPath}`);
