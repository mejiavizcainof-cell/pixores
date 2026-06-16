import { readdir, writeFile } from "fs/promises";
import path from "path";

const imageExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
const backgroundRoot = path.join(process.cwd(), "public", "background");
const manifestPath = path.join(backgroundRoot, "background-assets.json");

const toPublicUrl = (category, fileName) => {
  return `/background/${[category, fileName].map(encodeURIComponent).join("/")}`;
};

async function main() {
  try {
    const entries = await readdir(backgroundRoot, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const categories = await Promise.all(
      directories.map(async (category) => {
        const categoryPath = path.join(backgroundRoot, category);
        const files = await readdir(categoryPath, { withFileTypes: true });
        const assets = files
          .filter((file) => file.isFile() && imageExtensions.has(path.extname(file.name).toLowerCase()))
          .map((file) => ({
            name: path.basename(file.name, path.extname(file.name)).replace(/[-_]+/g, " "),
            src: toPublicUrl(category, file.name),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return { name: category, assets };
      })
    );

    await writeFile(
      manifestPath,
      `${JSON.stringify({ categories: categories.filter((category) => category.assets.length > 0) }, null, 2)}\n`,
      "utf8"
    );

    console.log(`Generated ${path.relative(process.cwd(), manifestPath)}`);
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log("No public/background folder found. Skipping background manifest.");
      return;
    }

    throw error;
  }
}

main();
