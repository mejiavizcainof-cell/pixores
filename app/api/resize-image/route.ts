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

    const width = Number(formData.get("width"));
    const height = Number(formData.get("height"));

    if (!width || !height) {
      return NextResponse.json(
        { error: "Width and height are required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const resized = await sharp(Buffer.from(bytes))
      .rotate()
      .resize(width, height)
      .jpeg()
      .toBuffer();

    return new NextResponse(
      new Uint8Array(resized),
      {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition":
            'attachment; filename="resized.jpg"',
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Resize failed" },
      { status: 500 }
    );
  }
}
