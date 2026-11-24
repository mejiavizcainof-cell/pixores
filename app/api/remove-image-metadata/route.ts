import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload one JPG, PNG or WebP image." }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "The image must be 4 MB or smaller." }, { status: 413 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 100_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return NextResponse.json({ error: "Only JPG, PNG and WebP images are supported." }, { status: 415 });
    }

    let output: Buffer;
    let contentType: string;
    let extension: string;
    if (metadata.format === "jpeg") {
      output = await image.rotate().jpeg({ quality: 95 }).toBuffer();
      contentType = "image/jpeg";
      extension = "jpg";
    } else if (metadata.format === "png") {
      output = await image.rotate().png().toBuffer();
      contentType = "image/png";
      extension = "png";
    } else {
      output = await image.rotate().webp({ quality: 95 }).toBuffer();
      contentType = "image/webp";
      extension = "webp";
    }

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="metadata-removed.${extension}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Metadata could not be removed. Check the image and try again." }, { status: 422 });
  }
}
