import type { PixoresVideoProject } from "@/src/video-render/types";
import type { SmartClipCandidate, SmartClipPlatformId } from "./smart-clips";
import type { SmartClipCaptionPosition } from "./caption-layout";
import type { SmartClipCaptionTemplateId } from "./caption-style-presets";

export const SMART_CLIP_PROJECT_VERSION = 1 as const;

export type SmartClipFaceFilterSettings = {
  enabled: boolean;
  smoothing: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  intensity: number;
  renderMode: "preview-only";
};

export const DEFAULT_SMART_CLIP_FACE_FILTERS: SmartClipFaceFilterSettings = {
  enabled: false,
  smoothing: 20,
  brightness: 8,
  contrast: 5,
  sharpness: 10,
  intensity: 50,
  // Face masking would force every otherwise native frame through the
  // compositor. Keep this explicit until a benchmark proves parity.
  renderMode: "preview-only",
};

export type SmartClipProjectSettings = {
  platformId: SmartClipPlatformId;
  segmentDuration: number;
  customWidth: number;
  customHeight: number;
  autoCaptions: boolean;
  captionTemplateId: SmartClipCaptionTemplateId;
  captionPosition: SmartClipCaptionPosition;
  captionSize: number;
  faceMode: "off" | "static" | "dynamic";
  speakerSelection: boolean;
  fastExport: boolean;
  subtitleLanguage: "auto" | "Spanish" | "English";
  subtitleModel: "tiny" | "base";
  faceFilters: SmartClipFaceFilterSettings;
};

export type SmartClipProjectWorkspace = {
  title: string;
  sourceProject: PixoresVideoProject;
  candidates: SmartClipCandidate[];
  activeCandidateId: string;
  previewOffset: number;
  settings: SmartClipProjectSettings;
};

export type SmartClipProjectDocument = PixoresVideoProject & {
  smartClipProjectVersion: typeof SMART_CLIP_PROJECT_VERSION;
  smartClipWorkspace: SmartClipProjectWorkspace;
};

function isVideoProject(value: unknown): value is PixoresVideoProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<PixoresVideoProject>;
  return project.schemaVersion === 1
    && Boolean(project.canvas)
    && Array.isArray(project.layers)
    && Array.isArray(project.assets)
    && Boolean(project.format);
}

function clampPercent(value: unknown, fallback: number) {
  const number = Number(value);
  return Math.round(Math.max(0, Math.min(100, Number.isFinite(number) ? number : fallback)));
}

export function normalizeSmartClipFaceFilters(value: unknown): SmartClipFaceFilterSettings {
  const filters = value && typeof value === "object" ? value as Partial<SmartClipFaceFilterSettings> : {};
  return {
    enabled: Boolean(filters.enabled),
    smoothing: clampPercent(filters.smoothing, DEFAULT_SMART_CLIP_FACE_FILTERS.smoothing),
    brightness: clampPercent(filters.brightness, DEFAULT_SMART_CLIP_FACE_FILTERS.brightness),
    contrast: clampPercent(filters.contrast, DEFAULT_SMART_CLIP_FACE_FILTERS.contrast),
    sharpness: clampPercent(filters.sharpness, DEFAULT_SMART_CLIP_FACE_FILTERS.sharpness),
    intensity: clampPercent(filters.intensity, DEFAULT_SMART_CLIP_FACE_FILTERS.intensity),
    renderMode: "preview-only",
  };
}

export function createSmartClipProjectDocument(
  preparedProject: PixoresVideoProject,
  workspace: SmartClipProjectWorkspace,
): SmartClipProjectDocument {
  const now = new Date().toISOString();
  return {
    ...preparedProject,
    updatedAt: now,
    smartClipProjectVersion: SMART_CLIP_PROJECT_VERSION,
    smartClipWorkspace: {
      ...workspace,
      candidates: workspace.candidates.map((candidate) => ({ ...candidate })),
      settings: {
        ...workspace.settings,
        faceFilters: normalizeSmartClipFaceFilters(workspace.settings.faceFilters),
      },
    },
  };
}

/** Reads v1 and the short-lived unversioned draft shape used during development. */
export function migrateSmartClipProject(value: unknown): SmartClipProjectDocument | null {
  if (!isVideoProject(value)) return null;
  const candidate = value as PixoresVideoProject & {
    smartClipProjectVersion?: unknown;
    smartClipWorkspace?: Partial<SmartClipProjectWorkspace>;
  };
  const version = candidate.smartClipProjectVersion === undefined ? 0 : Number(candidate.smartClipProjectVersion);
  if (!Number.isFinite(version) || version < 0 || version > SMART_CLIP_PROJECT_VERSION) return null;
  const workspace = candidate.smartClipWorkspace;
  if (!workspace || !isVideoProject(workspace.sourceProject) || !workspace.settings) return null;
  const settings = workspace.settings as SmartClipProjectSettings;
  return createSmartClipProjectDocument(candidate, {
    title: String(workspace.title || "Smart Clips project"),
    sourceProject: workspace.sourceProject,
    candidates: Array.isArray(workspace.candidates) ? workspace.candidates : [],
    activeCandidateId: String(workspace.activeCandidateId || workspace.candidates?.[0]?.id || ""),
    previewOffset: Math.max(0, Number(workspace.previewOffset) || 0),
    settings: {
      ...settings,
      faceFilters: normalizeSmartClipFaceFilters(settings.faceFilters),
    },
  });
}
