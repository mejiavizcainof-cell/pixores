export type PixoresVideoExportFormatId =
  | "mp4-h264"
  | "mp4-h265"
  | "mov-prores"
  | "webm-vp9"
  | "webm-vp8";

export type PixoresVideoExportFormat = {
  id: PixoresVideoExportFormatId;
  label: string;
  extension: "mp4" | "mov" | "webm";
  mimeType: string;
  codec: "h264" | "h265" | "prores" | "vp9" | "vp8";
};

export const PIXORES_DEFAULT_VIDEO_EXPORT_FORMAT_ID: PixoresVideoExportFormatId = "mp4-h264";

export const PIXORES_VIDEO_EXPORT_FORMATS: PixoresVideoExportFormat[] = [
  {
    id: "mp4-h264",
    label: "MP4 H.264",
    extension: "mp4",
    mimeType: "video/mp4",
    codec: "h264",
  },
  {
    id: "mp4-h265",
    label: "MP4 H.265 / HEVC",
    extension: "mp4",
    mimeType: "video/mp4",
    codec: "h265",
  },
  {
    id: "mov-prores",
    label: "MOV ProRes",
    extension: "mov",
    mimeType: "video/quicktime",
    codec: "prores",
  },
  {
    id: "webm-vp9",
    label: "WebM VP9",
    extension: "webm",
    mimeType: "video/webm",
    codec: "vp9",
  },
  {
    id: "webm-vp8",
    label: "WebM VP8",
    extension: "webm",
    mimeType: "video/webm",
    codec: "vp8",
  },
];

export function getPixoresVideoExportFormat(formatId?: string | null) {
  return (
    PIXORES_VIDEO_EXPORT_FORMATS.find((format) => format.id === formatId)
    || PIXORES_VIDEO_EXPORT_FORMATS.find((format) => format.id === PIXORES_DEFAULT_VIDEO_EXPORT_FORMAT_ID)
    || PIXORES_VIDEO_EXPORT_FORMATS[0]
  );
}

export function getPixoresVideoExportContentType(extension: string) {
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return "video/mp4";
}
