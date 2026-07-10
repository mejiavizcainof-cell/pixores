import type { ProjectPackageOpenResult, ProjectPackageSaveInput, ProjectPackageSaveResult, VideoProjectPackageAdapter } from "./types";

export const webProjectPackageAdapter: VideoProjectPackageAdapter = {
  kind: "web",
  async saveProjectPackage(_input: ProjectPackageSaveInput): Promise<ProjectPackageSaveResult> {
    throw new Error("Desktop project packages are only available in Pixores Desktop.");
  },

  async openProjectPackage(): Promise<ProjectPackageOpenResult> {
    throw new Error("Desktop project packages are only available in Pixores Desktop.");
  },
};
