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

    const pngBuffer = await sharp(Buffer.from(bytes))
      .png()
      .toBuffer();

    return new NextResponse(
      new Uint8Array(pngBuffer),
      {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition":
            'attachment; filename="converted.png"',
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