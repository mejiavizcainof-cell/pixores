import electronUpdater from "electron-updater";

function normalizeError(error, fallback = "Update request failed.") {
  return error instanceof Error ? error.message : fallback;
}

function createIdleState(patch = {}) {
  return {
    ok: true,
    status: "idle",
    message: "Updates are manual.",
    ...patch,
  };
}

function getVersionInfo(updateInfo) {
  if (!updateInfo) return {};
  return {
    version: updateInfo.version,
    releaseDate: updateInfo.releaseDate,
    releaseName: updateInfo.releaseName,
  };
}

export function createDesktopUpdateHandlers({ app }) {
  const { autoUpdater } = electronUpdater;
  let lastUpdateInfo = null;
  let isDownloaded = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = true;

  autoUpdater.on("update-available", (info) => {
    lastUpdateInfo = info;
    isDownloaded = false;
  });

  autoUpdater.on("update-not-available", (info) => {
    lastUpdateInfo = info;
    isDownloaded = false;
  });

  autoUpdater.on("update-downloaded", (info) => {
    lastUpdateInfo = info;
    isDownloaded = true;
  });

  return {
    async checkForUpdates() {
      if (!app.isPackaged) {
        return createIdleState({
          status: "unavailable",
          message: "Auto-update is available in packaged desktop builds.",
          currentVersion: app.getVersion(),
        });
      }

      try {
        const result = await autoUpdater.checkForUpdates();
        const updateInfo = result?.updateInfo;
        lastUpdateInfo = updateInfo || lastUpdateInfo;
        const available = Boolean(updateInfo?.version && updateInfo.version !== app.getVersion());

        return createIdleState({
          status: available ? "available" : "not_available",
          message: available ? "Update available." : "Pixores Video Maker is up to date.",
          currentVersion: app.getVersion(),
          updateAvailable: available,
          ...getVersionInfo(updateInfo),
        });
      } catch (error) {
        return createIdleState({
          ok: false,
          status: "error",
          message: normalizeError(error, "Unable to check for updates."),
          currentVersion: app.getVersion(),
        });
      }
    },

    async downloadUpdate() {
      if (!app.isPackaged) {
        return createIdleState({
          status: "unavailable",
          message: "Update downloads are available in packaged desktop builds.",
          currentVersion: app.getVersion(),
        });
      }

      try {
        const files = await autoUpdater.downloadUpdate();
        return createIdleState({
          status: "downloaded",
          message: "Update downloaded. Restart to install when ready.",
          currentVersion: app.getVersion(),
          downloaded: true,
          files,
          ...getVersionInfo(lastUpdateInfo),
        });
      } catch (error) {
        return createIdleState({
          ok: false,
          status: "error",
          message: normalizeError(error, "Unable to download update."),
          currentVersion: app.getVersion(),
          ...getVersionInfo(lastUpdateInfo),
        });
      }
    },

    async installUpdate() {
      if (!app.isPackaged) {
        return createIdleState({
          status: "unavailable",
          message: "Update installation is available in packaged desktop builds.",
          currentVersion: app.getVersion(),
        });
      }

      if (!isDownloaded) {
        return createIdleState({
          ok: false,
          status: "not_downloaded",
          message: "Download an update before restarting to install.",
          currentVersion: app.getVersion(),
          ...getVersionInfo(lastUpdateInfo),
        });
      }

      autoUpdater.quitAndInstall(false, true);
      return createIdleState({
        status: "installing",
        message: "Restarting to install update.",
        currentVersion: app.getVersion(),
        ...getVersionInfo(lastUpdateInfo),
      });
    },
  };
}
