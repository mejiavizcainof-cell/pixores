import type { PixoresVideoProject } from "@/src/video-render/types";
import type { PixoresMediaMetadata } from "@/src/video-render/types";
import type { PixoresVideoExportFormatId } from "@/src/video-render/export-formats";
import type { PixoresExportSettings } from "@/src/video-render/export-settings";

/**
 * Shared contracts for Pixores Video Maker runtime adapters.
 *
 * The React editor should talk to these interfaces instead of directly
 * depending on web APIs, Electron IPC, cloud storage, or local file paths.
 */

export type PixoresRenderStatus = "queued" | "analyzing" | "preparing" | "bundling" | "rendering" | "encoding" | "muxing" | "finalizing" | "completed" | "cancelled" | "failed";

export type PixoresRenderJobState = {
  renderId: string;
  status: PixoresRenderStatus;
  progress: number;
  outputUrl?: string;
  outputPath?: string;
  error?: string;
  warnings?: string[];
  renderedFrames?: number;
  totalFrames?: number;
  renderFps?: number;
  speed?: number;
  encoder?: string;
  proxyPrepared?: number;
  proxyTotal?: number;
  hybridRender?: boolean;
  hybridPrecomposing?: boolean;
  hybridRenderedFrames?: number;
  hybridTotalFrames?: number;
  segmentedRender?: boolean;
  currentSegment?: number;
  segmentCount?: number;
  segmentType?: "nvidia" | "compositor";
  complexDuration?: number;
};

export type StartRenderResult = PixoresRenderJobState & {
  message?: string;
};

export type StartRenderOptions = {
  outputFormatId?: PixoresVideoExportFormatId;
  exportSettings?: PixoresExportSettings;
  concurrencyKey?: string;
  renderSessionId?: string;
};

export type VideoRenderAdapter = {
  kind: "web" | "desktop";
  startRender: (project: PixoresVideoProject, options?: StartRenderOptions) => Promise<StartRenderResult>;
  getRenderStatus: (renderId: string) => Promise<PixoresRenderJobState>;
  cancelRender?: (renderId: string) => Promise<PixoresRenderJobState>;
};

export type AssetImportResult = {
  ok: true;
  assetUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  metadata?: PixoresMediaMetadata;
  localPath?: string;
  assetsRoot?: string;
  previewUrl?: string;
  waveformPeaks?: number[];
};

export type AssetImportContext = {
  projectTitle?: string;
  kind?: "image" | "video" | "audio";
};

export type VideoAssetAdapter = {
  kind: "web" | "desktop";
  importAsset: (file: File, context?: AssetImportContext) => Promise<AssetImportResult>;
  prepareAsset?: (input: { sourceUrl: string; kind: "video" | "audio"; metadata?: PixoresMediaMetadata }) => Promise<Pick<AssetImportResult, "previewUrl" | "waveformPeaks">>;
};

export type PixoresDesktopBridge = {
  importAsset?: (payload: { name: string; mimeType: string; size: number }) => Promise<AssetImportResult>;
  chooseProjectFolder?: (payload?: { title?: string }) => Promise<{ canceled: true } | { ok: true; canceled: false; projectFolder: string; assetsRoot: string }>;
  copyAssetToProject?: (payload: {
    name: string;
    mimeType: string;
    size: number;
    kind?: "image" | "video" | "audio";
    title?: string;
    bytes: ArrayBuffer;
  }) => Promise<AssetImportResult>;
  copyAssetFileToProject?: (file: File, payload?: {
    kind?: "image" | "video" | "audio";
    title?: string;
  }) => Promise<AssetImportResult>;
  prepareAsset?: (payload: { sourceUrl: string; kind: "video" | "audio"; metadata?: PixoresMediaMetadata }) => Promise<Pick<AssetImportResult, "previewUrl" | "waveformPeaks">>;
  listElementLibrary?: (userKey: string) => Promise<{ ok: true; items: unknown[] }>;
  saveElementLibraryItem?: (payload: { userKey: string; item: unknown }) => Promise<{ ok: true; item: unknown; items: unknown[] }>;
  removeElementLibraryItem?: (payload: { userKey: string; id: string }) => Promise<{ ok: true; items: unknown[] }>;
  listRecentDownloadedImages?: (payload: { since: number }) => Promise<{
    ok: true;
    scannedAt: number;
    files: Array<{ name: string; mimeType: string; size: number; lastModified: number; url: string }>;
  }>;
  removeImageBackground?: (payload: {
    accessToken: string;
    name: string;
    mimeType: string;
    bytes: ArrayBuffer;
  }) => Promise<{ ok: true; bytes: ArrayBuffer; mimeType: string; creditsRemaining?: number }>;
  openProjectPackage?: () => Promise<ProjectPackageOpenResult>;
  openRecentProjectPackage?: (filePath: string) => Promise<ProjectPackageOpenResult>;
  saveProjectPackage?: (payload: ProjectPackageSaveInput) => Promise<ProjectPackageSaveResult>;
  loadAutoSave?: () => Promise<{ ok: true; contents: unknown | null }>;
  saveAutoSave?: (contents: unknown) => Promise<{ ok: true; savedAt: string }>;
  clearAutoSave?: () => Promise<{ ok: true }>;
  getRecentProjects?: () => Promise<ProjectPackageRecentsResult>;
  addRecentProject?: (project: ProjectPackageRecentProject) => Promise<ProjectPackageRecentsResult>;
  saveRecentProject?: (project: ProjectPackageRecentProject) => Promise<ProjectPackageRecentsResult>;
  removeRecentProject?: (filePath: string) => Promise<ProjectPackageRecentsResult>;
  renameRecentProject?: (payload: ProjectPackageRenameRecentInput) => Promise<ProjectPackageRecentsResult>;
  duplicateRecentProject?: (filePath: string) => Promise<ProjectPackageRecentsResult>;
  getLicenseStatus?: () => Promise<PixoresLicenseStatus>;
  saveLicenseStatus?: (input: PixoresLicenseSaveInput) => Promise<PixoresLicenseStatus>;
  clearLicenseStatus?: () => Promise<PixoresLicenseStatus>;
  checkForUpdates?: () => Promise<PixoresUpdateStatus>;
  downloadUpdate?: () => Promise<PixoresUpdateStatus>;
  installUpdate?: () => Promise<PixoresUpdateStatus>;
  renderVideoLocal?: (project: PixoresVideoProject, options?: StartRenderOptions) => Promise<StartRenderResult>;
  startRender?: (project: PixoresVideoProject, options?: StartRenderOptions) => Promise<StartRenderResult>;
  getRenderStatus?: (renderId: string) => Promise<PixoresRenderJobState>;
  cancelRender?: (renderId: string) => Promise<PixoresRenderJobState>;
  chooseRenderOutputDirectory?: () => Promise<{ canceled: true } | { ok: true; canceled: false; directory: string }>;
  saveRenderedOutput?: (payload: { fileName: string; outputDirectory?: string; bytes: ArrayBuffer }) => Promise<{ ok: true; outputPath: string }>;
  detectSilences?: (payload: PixoresAudioAnalysisInput & { thresholdDb: number; minimumDuration: number }) => Promise<PixoresSilenceAnalysisResult>;
  transcribeMedia?: (payload: PixoresAudioAnalysisInput & { jobId: string; model: "tiny" | "base"; language: "auto" | "Spanish" | "English" }) => Promise<PixoresTranscriptionResult>;
  cancelAudioAi?: (jobId: string) => Promise<{ ok: true; cancelled: boolean }>;
  synchronizeAudio?: (payload: {
    reference: PixoresAudioAnalysisInput;
    target: PixoresAudioAnalysisInput;
    duration?: number;
    maxOffsetSeconds?: number;
  }) => Promise<{ ok: true; targetStartDeltaSeconds: number; confidence: number; comparedSeconds: number }>;
  onAudioAiProgress?: (callback: (progress: PixoresAudioAiProgress) => void) => () => void;
  getYouTubeStatus?: () => Promise<PixoresYouTubeStatus>;
  configureYouTube?: (payload: { clientId: string }) => Promise<PixoresYouTubeStatus>;
  connectYouTube?: (payload?: { clientId?: string }) => Promise<{ ok: true; connected: true; secureStorage: boolean }>;
  disconnectYouTube?: () => Promise<PixoresYouTubeStatus>;
  chooseYouTubeVideo?: () => Promise<{ canceled: true } | { ok: true; canceled: false; filePath: string }>;
  publishYouTube?: (payload: PixoresYouTubePublishInput) => Promise<PixoresYouTubePublishResult>;
  cancelYouTube?: (jobId: string) => Promise<{ ok: true; cancelled: boolean }>;
  onYouTubeProgress?: (callback: (progress: PixoresYouTubePublishProgress) => void) => () => void;
  openExternalUrl?: (url: string) => Promise<{ ok: true }>;
  setProjectDirty?: (dirty: boolean) => void;
  requestWindowClose?: () => Promise<{ ok: true; prompted: boolean }>;
  respondToWindowClose?: (response: "close" | "cancel") => Promise<{ ok: true }>;
  onWindowCloseRequested?: (callback: () => void) => () => void;
};

export type PixoresYouTubeStatus = {
  ok: true;
  configured: boolean;
  clientId: string;
  connected: boolean;
  secureStorage: boolean;
};

export type PixoresYouTubePublishProgress = {
  jobId: string;
  stage: "starting" | "uploading" | "thumbnail" | "processing" | "completed";
  progress: number;
  message: string;
  uploadedBytes?: number;
  totalBytes?: number;
  videoId?: string;
  url?: string;
};

export type PixoresYouTubePublishInput = {
  jobId: string;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: "private" | "unlisted" | "public";
  madeForKids: boolean;
  defaultLanguage?: string;
  mimeType?: string;
  thumbnail?: { bytes: ArrayBuffer; mimeType: string; name: string };
};

export type PixoresYouTubePublishResult = {
  ok: true;
  jobId: string;
  videoId: string;
  url: string;
  processingStatus: string;
};

export type PixoresAudioAnalysisInput = {
  sourceUrl: string;
  sourceUrls?: string[];
  sourceStart: number;
  sourceEnd: number;
};

export type PixoresSilenceRange = { start: number; end: number; duration: number };

export type PixoresSilenceAnalysisResult = {
  ok: true;
  silences: PixoresSilenceRange[];
  clipDuration: number;
  silentDuration: number;
  thresholdDb: number;
  minimumDuration: number;
};

export type PixoresCaption = {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
};

export type PixoresTranscriptionResult = {
  ok: true;
  captions: PixoresCaption[];
  language: string;
  model: "tiny" | "base";
};

export type PixoresAudioAiProgress = {
  jobId: string;
  stage: "preparing" | "installing" | "model" | "extracting" | "transcribing" | "complete";
  progress: number;
  message: string;
};

export type PixoresLicensePlan = "not_signed_in" | "free" | "pro" | "lifetime";

export type PixoresLicenseStatus = {
  ok: true;
  plan: PixoresLicensePlan;
  label: "Not signed in" | "Free" | "Pro" | "Lifetime";
  licenseKey?: string;
  source: "local" | "none";
  updatedAt?: string;
  accountEmail?: string;
  customerId?: string;
  subscriptionId?: string;
  provider?: "manual" | "stripe" | "supabase";
};

export type PixoresLicenseSaveInput = {
  licenseKey: string;
  accountEmail?: string;
};

export type PixoresUpdateStatus = {
  ok: boolean;
  status: "idle" | "unavailable" | "available" | "not_available" | "downloaded" | "installing" | "not_downloaded" | "error";
  message: string;
  currentVersion?: string;
  version?: string;
  releaseDate?: string;
  releaseName?: string;
  updateAvailable?: boolean;
  downloaded?: boolean;
  files?: string[];
};

export type ProjectPackageRecentProject = {
  filePath: string;
  title: string;
  updatedAt: string;
  formatLabel?: string;
  width?: number;
  height?: number;
};

export type ProjectPackageRecentsResult = {
  ok: true;
  projects: ProjectPackageRecentProject[];
};

export type ProjectPackageRenameRecentInput = {
  filePath: string;
  title: string;
};

export type ProjectPackageMetadata = {
  format: "pixores-video-package";
  version: 1;
  projectFile: "project.json";
  assetsDir: "assets";
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectPackageSaveInput = {
  title: string;
  project: PixoresVideoProject;
};

export type ProjectPackageSaveResult =
  | { canceled: true }
  | {
    ok: true;
    canceled: false;
    filePath: string;
    metadata: ProjectPackageMetadata;
  };

export type ProjectPackageOpenResult =
  | { canceled: true }
  | {
    ok: true;
    canceled: false;
    filePath: string;
    metadata: ProjectPackageMetadata;
    project: PixoresVideoProject;
    assets?: Array<Record<string, unknown>>;
  };

export type VideoProjectPackageAdapter = {
  kind: "web" | "desktop";
  saveProjectPackage: (input: ProjectPackageSaveInput) => Promise<ProjectPackageSaveResult>;
  openProjectPackage: () => Promise<ProjectPackageOpenResult>;
};
