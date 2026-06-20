import { CONVERSION_EVENT } from "@/components/ConversionProgressHost";

type DownloadOptions = {
  endpoint: string;
  formData: FormData;
  fallbackFileName: string;
  headers?: HeadersInit;
  timeoutMs?: number;
  processingMessage?: string;
  processingHint?: string;
};

const notify = (phase: string, detail: Record<string, string> = {}) => {
  window.dispatchEvent(new CustomEvent(CONVERSION_EVENT, { detail: { phase, ...detail } }));
};

export async function downloadConvertedFile({
  endpoint,
  formData,
  fallbackFileName,
  headers,
  timeoutMs = 120000,
  processingMessage,
  processingHint,
}: DownloadOptions) {
  const sourceFile = formData.get("file");
  notify("start", {
    fileName: sourceFile instanceof File ? sourceFile.name : fallbackFileName,
    ...(processingMessage ? { status: processingMessage } : {}),
    ...(processingHint ? { hint: processingHint } : {}),
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, { method: "POST", body: formData, headers, signal: controller.signal });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "The file could not be converted.");
    }

    notify("preparing");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const disposition = response.headers.get("content-disposition") || "";
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFileName;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("complete", { fileName });
    return true;
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "Processing took too long. Please try a smaller image or use 2x enhancement."
      : error instanceof Error ? error.message : "The file could not be converted.";
    notify("error", { error: message });
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}
