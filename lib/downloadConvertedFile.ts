import { CONVERSION_EVENT } from "@/components/ConversionProgressHost";

type DownloadOptions = {
  endpoint: string;
  formData: FormData;
  fallbackFileName: string;
};

const notify = (phase: string, detail: Record<string, string> = {}) => {
  window.dispatchEvent(new CustomEvent(CONVERSION_EVENT, { detail: { phase, ...detail } }));
};

export async function downloadConvertedFile({ endpoint, formData, fallbackFileName }: DownloadOptions) {
  const sourceFile = formData.get("file");
  notify("start", { fileName: sourceFile instanceof File ? sourceFile.name : fallbackFileName });

  try {
    const response = await fetch(endpoint, { method: "POST", body: formData });
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
    notify("error", { error: error instanceof Error ? error.message : "The file could not be converted." });
    return false;
  }
}
