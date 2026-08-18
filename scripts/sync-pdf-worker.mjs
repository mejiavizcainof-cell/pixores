import fs from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const sourcePath = path.join(workspaceRoot, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs");
const targetPath = path.join(workspaceRoot, "public", "pdf.worker.min.mjs");

await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.copyFile(sourcePath, targetPath);
console.log("PDF.js browser worker ready.");
