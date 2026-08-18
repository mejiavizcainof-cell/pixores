const PIXORES_SITE_URL = String(process.env.PIXORES_WEBSITE_URL || "https://www.pixores.com").replace(/\/$/, "");

export function createImageAiHandlers() {
  return {
    async removeBackground(payload = {}) {
      const accessToken = String(payload.accessToken || "");
      const bytes = payload.bytes instanceof ArrayBuffer
        ? new Uint8Array(payload.bytes)
        : new Uint8Array(payload.bytes || []);
      if (!accessToken) throw new Error("Sign in to Pixores before using AI background removal.");
      if (!bytes.byteLength) throw new Error("The selected image could not be read.");
      if (bytes.byteLength > 20 * 1024 * 1024) throw new Error("The image must be smaller than 20 MB.");

      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: String(payload.mimeType || "image/png") }), String(payload.name || "image.png"));
      const response = await fetch(`${PIXORES_SITE_URL}/api/ai-background-remover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!response.ok) {
        const message = await response.text();
        let detail = message;
        try {
          const parsed = JSON.parse(message);
          detail = parsed.error === "NO_CREDITS" ? "No AI credits remain on this Pixores account." : parsed.error || message;
        } catch {
          // Keep the server response when it is not JSON.
        }
        throw new Error(detail || "Pixores could not remove the image background.");
      }
      return {
        ok: true,
        bytes: await response.arrayBuffer(),
        mimeType: response.headers.get("content-type") || "image/png",
        creditsRemaining: Number(response.headers.get("x-credits-remaining")) || undefined,
      };
    },
  };
}
