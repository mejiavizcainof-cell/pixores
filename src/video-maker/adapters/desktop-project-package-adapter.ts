import { getPixoresDesktopBridge } from "./runtime";
import type { ProjectPackageOpenResult, ProjectPackageSaveInput, ProjectPackageSaveResult, VideoProjectPackageAdapter } from "./types";

export const desktopProjectPackageAdapter: VideoProjectPackageAdapter = {
  kind: "desktop",
  async saveProjectPackage(input: ProjectPackageSaveInput): Promise<ProjectPackageSaveResult> {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.saveProjectPackage) {
      throw new Error("Desktop project package bridge is not available.");
    }

    return bridge.saveProjectPackage(input);
  },

  async openProjectPackage(): Promise<ProjectPackageOpenResult> {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.openProjectPackage) {
      throw new Error("Desktop project package bridge is not available.");
    }

    return bridge.openProjectPackage();
  },
};
