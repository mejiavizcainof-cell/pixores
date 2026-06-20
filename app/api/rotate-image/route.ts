import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const allowedAngles = new Set([0, 90, 180, 270]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const angle = Number(formData.get("angle") || 0);
    const flipHorizontal = formData.get("flipHorizontal") === "true";
    const flipVertical = formData.get("flipVertical") === "true";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Select an image first." }, { status: 400 });
    }
    if (!allowedAngles.has(angle)) {
      return NextResponse.json({ error: "Invalid rotation angle." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const autoOriented = await sharp(bytes, { animated: false }).rotate().toBuffer();
    let image = sharp(autoOriented, { animated: false });

    if (angle) image = image.rotate(angle);
    if (flipHorizontal) image = image.flop();
    if (flipVertical) image = image.flip();

    const mimeType = file.type.toLowerCase();
    let output: Buffer;
    let extension: "png" | "webp" | "jpg";
    let contentType: string;

    if (mimeType === "image/png") {
      output = await image.png({ compressionLevel: 8 }).toBuffer();
      extension = "png";
      contentType = "image/png";
    } else if (mimeType === "image/webp") {
      output = await image.webp({ quality: 94, effort: 4 }).toBuffer();
      extension = "webp";
      contentType = "image/webp";
    } else {
      output = await image.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer();
      extension = "jpg";
      contentType = "image/jpeg";
    }

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="oriented-image.${extension}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Image orientation failed:", error);
    return NextResponse.json({ error: "The image orientation could not be changed." }, { status: 500 });
  }
}
