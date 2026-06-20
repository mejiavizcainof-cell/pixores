import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const webpBuffer = await sharp(
      Buffer.from(bytes)
    )
      .rotate()
      .webp({
        quality: 90,
      })
      .toBuffer();

    return new NextResponse(
      new Uint8Array(webpBuffer),
      {
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition":
            'attachment; filename="converted.webp"',
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Conversion failed" },
      { status: 500 }
    );
  }
}
