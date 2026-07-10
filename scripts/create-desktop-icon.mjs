import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "desktop", "assets");
const pngPath = path.join(outDir, "icon.png");
const icoPath = path.join(outDir, "icon.ico");

await fs.mkdir(outDir, { recursive: true });

const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="56" fill="#2563eb"/>
  <path d="M72 196V56h70c29 0 51 21 51 49 0 30-22 51-53 51h-31v40H72Zm37-72h29c12 0 20-8 20-19 0-10-8-18-20-18h-29v37Z" fill="#ffffff"/>
  <circle cx="190" cy="190" r="26" fill="#38bdf8"/>
</svg>`;

const pngBuffer = await sharp(Buffer.from(svg)).png().resize(256, 256).toBuffer();
await fs.writeFile(pngPath, pngBuffer);

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
directory.writeUInt32LE(pngBuffer.length, 8);
directory.writeUInt32LE(header.length + directory.length, 12);

await fs.writeFile(icoPath, Buffer.concat([header, directory, pngBuffer]));

console.log(`Created ${icoPath}`);
