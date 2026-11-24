import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const width = Number(formData.get("width"));
    const height = Number(formData.get("height"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload one JPG, PNG or WebP image." }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be 4 MB or smaller." }, { status: 413 });
    }
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8000 || height > 8000 || width * height > 40_000_000) {
      return NextResponse.json({ error: "Dimensions must be at most 8000 pixels per side and 40 megapixels total." }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 100_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return NextResponse.json({ error: "The uploaded file is not a supported JPG, PNG or WebP image." }, { status: 415 });
    }

    const resized = await image
      .rotate()
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 90 })
      .toBuffer();

    return new NextResponse(new Uint8Array(resized), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="resized.jpg"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Resize failed. Check the image and try again." }, { status: 422 });
  }
}
