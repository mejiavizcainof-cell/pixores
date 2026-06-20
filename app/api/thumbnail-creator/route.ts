import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Configuraciones nativas de dimensiones estandarizadas
const sizes = {
  youtube: { width: 1280, height: 720 },
  facebook: { width: 1200, height: 630 },
  instagram: { width: 1080, height: 1080 },
  tiktok: { width: 1080, height: 1920 },
};

function escapeSvg(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ==========================================
// NUEVO: ESCUDO DE PROTECCIÓN CONTRA SOLICITUDES PASIVAS GET
// ==========================================
export async function GET() {
  return NextResponse.json({ 
    status: "online", 
    message: "Studio API activa. Utiliza POST para procesar imágenes o IA." 
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    // 1. DETERMINAR EL TIPO DE CONTENIDO DE LA PETICIÓN
    const contentType = request.headers.get("content-type") || "";

    // Background removal now has a dedicated authenticated remove.bg endpoint.
    if (contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Use /api/ai-background-remover for AI background removal." },
        { status: 410 },
      );
    }

    // ==========================================
    // FLUJO B: PETICIÓN FORM-DATA (RENDERIZADOR SHARP EN HD)
    // ==========================================
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const platform = (formData.get("platform") || "youtube") as keyof typeof sizes;
    const { width, height } = sizes[platform];

    // Datos crudos de la imagen de fondo subida por el cliente
    const backgroundBuffer = Buffer.from(await file.arrayBuffer());

    const title = escapeSvg(String(formData.get("title") || ""));
    const subtitle = escapeSvg(String(formData.get("subtitle") || ""));
    const badge = escapeSvg(String(formData.get("badge") || ""));
    const align = String(formData.get("align") || "center");
    const textColor = String(formData.get("textColor") || "#ffffff");
    const strokeColor = String(formData.get("strokeColor") || "#000000");
    const fontSize = Number(formData.get("fontSize") || 72);
    const strokeWidth = Number(formData.get("strokeWidth") || 8);
    const showBackground = formData.get("showBackground") === "true";
    const textX = Number(formData.get("textX") || 50);
    const textY = Number(formData.get("textY") || 70);

    // Cálculos de coordenadas relativas
    const x = (width * textX) / 100;
    const y = (height * textY) / 100;

    let textAnchor = "middle";
    if (align === "left") textAnchor = "start";
    if (align === "right") textAnchor = "end";

    // Reconstrucción del Split de líneas basado en tu lógica original
    const words = title.split(" ");
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += 3) {
      lines.push(words.slice(i, i + 3).join(" ").toUpperCase());
    }

    const textElements = lines
      .map((line, index) => `
        <text
          x="${x}"
          y="${y + index * (fontSize + 20)}"
          fill="${textColor}"
          font-size="${fontSize}"
          font-weight="900"
          font-family="Arial, Impact, sans-serif"
          text-anchor="${textAnchor}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
        >${line}</text>
      `).join("");

    const subtitleElement = subtitle ? `
      <text
        x="${x}"
        y="${y + lines.length * (fontSize + 20) + 60}"
        fill="${textColor}"
        font-size="${fontSize * 0.55}"
        font-weight="700"
        font-family="Arial, sans-serif"
        text-anchor="${textAnchor}"
      >${subtitle}</text>
    ` : "";

    const badgeWidth = Math.max(220, badge.length * 18);
    const badgeElement = badge ? `
      <g>
        <rect x="30" y="30" width="${badgeWidth}" height="70" rx="16" fill="#DC2626" />
        <text x="${30 + badgeWidth / 2}" y="75" fill="#ffffff" font-size="34" font-weight="900" font-family="Arial" text-anchor="middle">${badge}</text>
      </g>
    ` : "";

    const backgroundRect = showBackground ? `
      <rect
        x="${x - width * 0.35}"
        y="${y - fontSize}"
        width="${width * 0.7}"
        height="${lines.length * (fontSize + 20) + 120}"
        fill="#000000"
        fill-opacity="0.55"
        rx="30"
      />
    ` : "";

    const svgComposite = `
      <svg width="${width}" height="${height}">
        ${backgroundRect}
        ${badgeElement}
        ${textElements}
        ${subtitleElement}
      </svg>
    `;

    // 2. PROCESAMIENTO GRÁFICO CON SHARP
    const output = await sharp(backgroundBuffer)
      .rotate()
      .resize(width, height, { fit: "cover" })
      .composite([{ input: Buffer.from(svgComposite) }])
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="thumbnail-sharp.png"',
      },
    });

  } catch (error) {
    console.error("Fallo general en route.ts:", error);
    return NextResponse.json({ error: "Thumbnail generation or IA failed" }, { status: 500 });
  }
}
