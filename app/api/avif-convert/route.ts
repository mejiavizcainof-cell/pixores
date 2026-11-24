import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const outputFormat = formData.get("outputFormat");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload one AVIF image." }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "The AVIF image must be 4 MB or smaller." }, { status: 413 });
    }
    if (outputFormat !== "jpg" && outputFormat !== "png") {
      return NextResponse.json({ error: "Choose JPG or PNG as the output format." }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { animated: true, limitInputPixels: 100_000_000 });
    const metadata = await image.metadata();
    const isAvif = metadata.format === "heif"
      && (metadata.compression === "av1"
        || (metadata.compression == null && (file.type === "image/avif" || file.name.toLowerCase().endsWith(".avif"))));

    if (!isAvif || (metadata.pages ?? 1) > 1) {
      return NextResponse.json({ error: "Upload one static AVIF image. Animated AVIF files are not supported." }, { status: 415 });
    }

    let output: Buffer;
    if (outputFormat === "jpg") {
      output = await sharp(input, { limitInputPixels: 100_000_000 })
        .rotate()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      output = await sharp(input, { limitInputPixels: 100_000_000 })
        .rotate()
        .png()
        .toBuffer();
    }

    const extension = outputFormat === "jpg" ? "jpg" : "png";
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": outputFormat === "jpg" ? "image/jpeg" : "image/png",
        "Content-Disposition": `attachment; filename="converted.${extension}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "AVIF conversion failed. Check that the file is a static AVIF image and try again." }, { status: 422 });
  }
}
