import sharp from "sharp";
import { aiErrorResponse, consumeAiCredit, requireAiCredit } from "@/lib/aiCredits";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_OUTPUT_SIDE = 4096;

function getClipdropKey() {
  const key = process.env.CLIPDROP_API_KEY;
  if (!key) throw new Error("CLIPDROP_API_KEY is not configured on the server.");
  return key;
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function POST(request: Request) {
  try {
    const creditSession = await requireAiCredit(request);
    const incoming = await request.formData();
    const file = incoming.get("file");
    const requestedScale = Number(incoming.get("scale"));
    const scale = requestedScale === 4 ? 4 : 2;

    if (!(file instanceof File)) {
      return Response.json({ success: false, error: "Choose an image first." }, { status: 400 });
    }

    if (!file.size || file.size > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, error: "The image must be smaller than 20 MB." },
        { status: 413 },
      );
    }

    const imageBytes = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(imageBytes).metadata();
    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height) {
      return Response.json({ success: false, error: "The image dimensions could not be read." }, { status: 400 });
    }

    if (width > MAX_OUTPUT_SIDE || height > MAX_OUTPUT_SIDE) {
      return Response.json(
        { success: false, error: "The source image cannot exceed 4096 pixels on either side." },
        { status: 400 },
      );
    }

    const outputScale = Math.min(scale, MAX_OUTPUT_SIDE / width, MAX_OUTPUT_SIDE / height);
    const targetWidth = Math.max(width, Math.round(width * outputScale));
    const targetHeight = Math.max(height, Math.round(height * outputScale));

    const clipdropForm = new FormData();
    clipdropForm.append("image_file", new Blob([toArrayBuffer(imageBytes)], { type: file.type || "image/png" }), file.name);
    clipdropForm.append("target_width", String(targetWidth));
    clipdropForm.append("target_height", String(targetHeight));

    const clipdropResponse = await fetch("https://clipdrop-api.co/image-upscaling/v1/upscale", {
      method: "POST",
      headers: { "x-api-key": getClipdropKey() },
      body: clipdropForm,
    });

    if (!clipdropResponse.ok) {
      const detail = await clipdropResponse.text();
      return Response.json(
        { success: false, error: detail || "Clipdrop could not upscale the image." },
        { status: clipdropResponse.status },
      );
    }

    const result = await clipdropResponse.arrayBuffer();
    const creditsRemaining = await consumeAiCredit(creditSession);
    const resultType = clipdropResponse.headers.get("content-type") || "image/png";

    return new Response(result, {
      headers: {
        "Content-Type": resultType,
        "Content-Disposition": 'attachment; filename="upscaled-image.png"',
        "X-Credits-Remaining": String(creditsRemaining),
        "X-Output-Dimensions": `${targetWidth}x${targetHeight}`,
      },
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
