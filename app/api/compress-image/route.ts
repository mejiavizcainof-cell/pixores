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

    const compressed = await sharp(Buffer.from(bytes))
      .jpeg({
        quality: 60,
      })
      .toBuffer();

    return new NextResponse(
      new Uint8Array(compressed),
      {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition":
            'attachment; filename="compressed.jpg"',
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Compression failed" },
      { status: 500 }
    );
  }
}