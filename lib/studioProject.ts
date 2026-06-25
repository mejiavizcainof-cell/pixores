export const STUDIO_PROJECT_SCHEMA_VERSION = 2;
export const STUDIO_PROJECT_EDITOR = "ThumbnailEditorV2";

export type StudioProjectLayer = Record<string, unknown>;

export type StudioProjectCanvas = {
  width: number;
  height: number;
  preset: string;
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundOpacity: number;
  backgroundBlur: number;
  strokeColor: string;
  strokeWidth: number;
};

export type StudioProjectData<TLayer = StudioProjectLayer> = {
  schemaVersion: typeof STUDIO_PROJECT_SCHEMA_VERSION;
  savedAt: string;
  editor: typeof STUDIO_PROJECT_EDITOR;
  canvas: StudioProjectCanvas;
  layers: TLayer[];
};

export type LegacyStudioProjectData<TLayer = StudioProjectLayer> = Partial<StudioProjectData<TLayer>> & {
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBgColor?: string;
  canvasStrokeColor?: string;
  canvasStrokeWidth?: number;
  preview?: string | null;
  thumbnail?: string | null;
  layers?: TLayer[];
  [key: string]: unknown;
};

export type SavedStudioProject<TLayer = StudioProjectLayer> = {
  id: string;
  user_id: string;
  name: string;
  project_data: LegacyStudioProjectData<TLayer>;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
};

type NormalizeStudioProjectOptions = {
  fallbackPreset?: string;
  fallbackWidth?: number;
  fallbackHeight?: number;
};

const asNumber = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const asNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;

export function normalizeStudioProjectData<TLayer = StudioProjectLayer>(
  input: LegacyStudioProjectData<TLayer> | null | undefined,
  options: NormalizeStudioProjectOptions = {},
): StudioProjectData<TLayer> {
  const data = input || {};
  const canvas = (data.canvas || {}) as Partial<StudioProjectCanvas>;
  const fallbackWidth = options.fallbackWidth || 1280;
  const fallbackHeight = options.fallbackHeight || 720;
  const width = asNumber(canvas.width ?? data.canvasWidth, fallbackWidth);
  const height = asNumber(canvas.height ?? data.canvasHeight, fallbackHeight);

  return {
    schemaVersion: STUDIO_PROJECT_SCHEMA_VERSION,
    savedAt: asString(data.savedAt, new Date().toISOString()),
    editor: STUDIO_PROJECT_EDITOR,
    canvas: {
      width,
      height,
      preset: asString(canvas.preset, options.fallbackPreset || "custom"),
      backgroundColor: asString(canvas.backgroundColor ?? data.canvasBgColor, "#FFFFFF"),
      backgroundImage: asNullableString(canvas.backgroundImage ?? data.preview),
      backgroundOpacity: asNumber(canvas.backgroundOpacity, 1),
      backgroundBlur: asNumber(canvas.backgroundBlur, 0),
      strokeColor: asString(canvas.strokeColor ?? data.canvasStrokeColor, "#0F172A"),
      strokeWidth: asNumber(canvas.strokeWidth ?? data.canvasStrokeWidth, 0),
    },
    layers: Array.isArray(data.layers) ? data.layers : [],
  };
}
