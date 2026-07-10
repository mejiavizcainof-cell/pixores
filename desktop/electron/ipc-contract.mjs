/**
 * IPC channel names for Pixores desktop.
 *
 * Keep the channel surface small and explicit. Renderer code should access
 * these only through preload, never through direct Node/Electron APIs.
 */

export const PIXORES_DESKTOP_CHANNELS = Object.freeze({
  assetsImport: "pixores:assets:import",
  assetsChooseProjectFolder: "pixores:assets:choose-project-folder",
  assetsCopyToProject: "pixores:assets:copy-to-project",
  projectPackageOpen: "pixores:project-package:open",
  projectPackageOpenRecent: "pixores:project-package:open-recent",
  projectPackageSave: "pixores:project-package:save",
  projectPackageRecentList: "pixores:project-package:recent-list",
  projectPackageRecentSave: "pixores:project-package:recent-save",
  projectPackageRecentAdd: "pixores:project-package:recent-add",
  projectPackageRecentRemove: "pixores:project-package:recent-remove",
  projectPackageRecentRename: "pixores:project-package:recent-rename",
  projectPackageRecentDuplicate: "pixores:project-package:recent-duplicate",
  projectOpen: "pixores:project:open",
  projectSave: "pixores:project:save",
  licenseStatusGet: "pixores:license:get-status",
  licenseStatusSave: "pixores:license:save-status",
  licenseStatusClear: "pixores:license:clear-status",
  updateCheck: "pixores:update:check",
  updateDownload: "pixores:update:download",
  updateInstall: "pixores:update:install",
  renderVideoLocal: "pixores:render:video-local",
  renderStart: "pixores:render:start",
  renderStatus: "pixores:render:status",
});
