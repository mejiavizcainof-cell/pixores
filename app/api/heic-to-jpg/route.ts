import { NextRequest, NextResponse } from "next/server";
import heicConvert from "heic-convert";

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

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const outputBuffer = await heicConvert({
      buffer,
      format: "JPEG",
      quality: 1,
    });

    return new NextResponse(
      new Uint8Array(outputBuffer as Buffer),
      {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition":
            'attachment; filename="converted.jpg"',
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