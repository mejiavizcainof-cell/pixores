import { readdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

type BackgroundAsset = {
  name: string;
  src: string;
};

type BackgroundCategory = {
  name: string;
  assets: BackgroundAsset[];
};

const toPublicUrl = (category: string, fileName: string) => {
  return `/background/${[category, fileName].map(encodeURIComponent).join("/")}`;
};

export async function GET() {
  const backgroundRoot = path.join(process.cwd(), "public", "background");

  try {
    const entries = await readdir(backgroundRoot, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const categories = await Promise.all(
      directories.map(async (category): Promise<BackgroundCategory> => {
        const categoryPath = path.join(backgroundRoot, category);
        const files = await readdir(categoryPath, { withFileTypes: true });
        const assets = files
          .filter((file) => file.isFile() && IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
          .map((file) => ({
            name: path.basename(file.name, path.extname(file.name)).replace(/[-_]+/g, " "),
            src: toPublicUrl(category, file.name),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return { name: category, assets };
      })
    );

    return Response.json({ categories: categories.filter((category) => category.assets.length > 0) });
  } catch (error) {
    console.error("Unable to load background assets:", error);
    return Response.json({ categories: [] });
  }
}
