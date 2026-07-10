import type { PixoresVideoProject } from "@/src/video-render/types";
import type { PixoresMediaMetadata } from "@/src/video-render/types";
import type { PixoresVideoExportFormatId } from "@/src/video-render/export-formats";

/**
 * Shared contracts for Pixores Video Maker runtime adapters.
 *
 * The React editor should talk to these interfaces instead of directly
 * depending on web APIs, Electron IPC, cloud storage, or local file paths.
 */

export type PixoresRenderStatus = "queued" | "rendering" | "completed" | "failed";

export type PixoresRenderJobState = {
  renderId: string;
  status: PixoresRenderStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
  warnings?: string[];
};

export type StartRenderResult = PixoresRenderJobState & {
  message?: string;
};

export type StartRenderOptions = {
  outputFormatId?: PixoresVideoExportFormatId;
};

export type VideoRenderAdapter = {
  kind: "web" | "desktop";
  startRender: (project: PixoresVideoProject, options?: StartRenderOptions) => Promise<StartRenderResult>;
  getRenderStatus: (renderId: string) => Promise<PixoresRenderJobState>;
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
};

export type AssetImportContext = {
  projectTitle?: string;
  kind?: "image" | "video" | "audio";
};

export type VideoAssetAdapter = {
  kind: "web" | "desktop";
  importAsset: (file: File, context?: AssetImportContext) => Promise<AssetImportResult>;
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
  openProjectPackage?: () => Promise<ProjectPackageOpenResult>;
  openRecentProjectPackage?: (filePath: string) => Promise<ProjectPackageOpenResult>;
  saveProjectPackage?: (payload: ProjectPackageSaveInput) => Promise<ProjectPackageSaveResult>;
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
