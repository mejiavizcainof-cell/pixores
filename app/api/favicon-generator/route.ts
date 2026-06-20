import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import JSZip from "jszip";

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

    const image = sharp(Buffer.from(bytes)).rotate();

    const favicon16 = await image
      .clone()
      .resize(16, 16)
      .png()
      .toBuffer();

    const favicon32 = await image
      .clone()
      .resize(32, 32)
      .png()
      .toBuffer();

    const appleTouch = await image
      .clone()
      .resize(180, 180)
      .png()
      .toBuffer();

    const android192 = await image
      .clone()
      .resize(192, 192)
      .png()
      .toBuffer();

    const android512 = await image
      .clone()
      .resize(512, 512)
      .png()
      .toBuffer();

    const faviconIco = await image
      .clone()
      .resize(32, 32)
      .png()
      .toBuffer();

    const manifest = {
      name: "Pixores",
      short_name: "Pixores",
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      theme_color: "#2563EB",
      background_color: "#ffffff",
      display: "standalone",
    };

    const zip = new JSZip();

    zip.file("favicon-16x16.png", favicon16);
    zip.file("favicon-32x32.png", favicon32);
    zip.file("favicon.ico", faviconIco);

    zip.file(
      "apple-touch-icon.png",
      appleTouch
    );

    zip.file(
      "android-chrome-192x192.png",
      android192
    );

    zip.file(
      "android-chrome-512x512.png",
      android512
    );

    zip.file(
      "site.webmanifest",
      JSON.stringify(manifest, null, 2)
    );

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
    });

    return new NextResponse(
      new Uint8Array(zipBuffer),
      {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition":
            'attachment; filename="pixores-favicon-pack.zip"',
        },
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
