import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
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
    const orientedJpg = await sharp(Buffer.from(bytes))
      .rotate()
      .jpeg({ quality: 95 })
      .toBuffer();

    const pdfDoc = await PDFDocument.create();

    const image = await pdfDoc.embedJpg(orientedJpg);

    const page = pdfDoc.addPage([
      image.width,
      image.height,
    ]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(
      new Uint8Array(pdfBytes),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="converted.pdf"',
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
