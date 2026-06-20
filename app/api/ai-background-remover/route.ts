import { aiErrorResponse, consumeAiCredit, requireAiCredit } from "@/lib/aiCredits";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getRemoveBgKey() {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) throw new Error("REMOVE_BG_API_KEY is not configured on the server.");
  return key;
}

function decodeImage(imageBase64: string) {
  const match = imageBase64.match(/^data:([^;,]+);base64,(.+)$/);
  const mimeType = match?.[1] || "image/png";
  const encoded = match?.[2] || imageBase64;
  return { bytes: Buffer.from(encoded, "base64"), mimeType };
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function POST(request: Request) {
  try {
    const creditSession = await requireAiCredit(request);
    const contentType = request.headers.get("content-type") || "";
    const wantsJson = contentType.includes("application/json");
    let imageBytes: Buffer;
    let mimeType: string;
    let fileName: string;

    if (wantsJson) {
      const body = (await request.json()) as { imageBase64?: string };
      if (!body.imageBase64) {
        return Response.json({ success: false, error: "No image was provided." }, { status: 400 });
      }
      const decoded = decodeImage(body.imageBase64);
      imageBytes = decoded.bytes;
      mimeType = decoded.mimeType;
      fileName = "image.png";
    } else {
      const incoming = await request.formData();
      const file = incoming.get("file");
      if (!(file instanceof File)) {
        return Response.json({ success: false, error: "Choose an image first." }, { status: 400 });
      }
      imageBytes = Buffer.from(await file.arrayBuffer());
      mimeType = file.type || "image/png";
      fileName = file.name || "image.png";
    }

    if (!imageBytes.length || imageBytes.length > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, error: "The image must be smaller than 20 MB." },
        { status: 413 },
      );
    }

    const removeBgForm = new FormData();
    removeBgForm.append("image_file", new Blob([toArrayBuffer(imageBytes)], { type: mimeType }), fileName);
    removeBgForm.append("size", "auto");
    removeBgForm.append("format", "png");

    const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": getRemoveBgKey() },
      body: removeBgForm,
    });

    if (!removeBgResponse.ok) {
      const detail = await removeBgResponse.text();
      return Response.json(
        { success: false, error: detail || "remove.bg could not remove the background." },
        { status: removeBgResponse.status },
      );
    }

    const result = Buffer.from(await removeBgResponse.arrayBuffer());
    const creditsRemaining = await consumeAiCredit(creditSession);

    if (wantsJson) {
      return Response.json({
        success: true,
        image: `data:image/png;base64,${result.toString("base64")}`,
        creditsRemaining,
      });
    }

    return new Response(result, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="background-removed.png"',
        "X-Credits-Remaining": String(creditsRemaining),
      },
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
