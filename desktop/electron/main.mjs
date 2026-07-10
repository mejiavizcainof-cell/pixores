import { app, BrowserWindow, dialog, ipcMain } from "electron";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PIXORES_DESKTOP_CHANNELS } from "./ipc-contract.mjs";
import { createDesktopAssetHandlers } from "./services/asset-adapter.mjs";
import { createDesktopLicenseHandlers } from "./services/license-status.mjs";
import { createDesktopProjectHandlers } from "./services/project-package.mjs";
import { createDesktopRenderHandlers } from "./services/render-adapter.mjs";
import { createDesktopUpdateHandlers } from "./services/update-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.PIXORES_DESKTOP_DEV === "1";
const nextDevUrl = process.env.PIXORES_DESKTOP_URL || "http://localhost:3000/video-maker/start?desktop=1";

let mainWindow;
let nextServer;
const desktopState = {
  packagePath: "",
  projectFolder: "",
  assetsRoot: "",
};

function getAppRoot() {
  return app.isPackaged ? app.getAppPath() : process.cwd();
}

async function startPackagedNextServer() {
  const nextModule = await import("next");
  const next = nextModule.default;
  const nextApp = next({
    dev: false,
    dir: getAppRoot(),
    hostname: "127.0.0.1",
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  nextServer = http.createServer((request, response) => {
    void handle(request, response);
  });

  await new Promise((resolve, reject) => {
    nextServer.once("error", reject);
    nextServer.listen(0, "127.0.0.1", resolve);
  });

  const address = nextServer.address();
  const port = typeof address === "object" && address ? address.port : 3000;
  return `http://127.0.0.1:${port}/video-maker/start?desktop=1`;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("did-finish-load", async () => {
    const hasDesktopBridge = await mainWindow.webContents.executeJavaScript("Boolean(window.pixoresDesktop)");
    console.log(`[pixores-desktop] window.pixoresDesktop ${hasDesktopBridge ? "ready" : "missing"}`);
  });

  const targetUrl = isDev ? nextDevUrl : await startPackagedNextServer();
  void mainWindow.loadURL(targetUrl);
}

function registerIpcHandlers() {
  const assetHandlers = createDesktopAssetHandlers({ app, dialog, state: desktopState });
  const licenseHandlers = createDesktopLicenseHandlers({ app });
  const projectHandlers = createDesktopProjectHandlers({ app, dialog, state: desktopState });
  const renderHandlers = createDesktopRenderHandlers({ app, state: desktopState, appRoot: getAppRoot() });
  const updateHandlers = createDesktopUpdateHandlers({ app });

  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsImport, (_event, payload) => assetHandlers.importAsset(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsChooseProjectFolder, (_event, payload) => assetHandlers.chooseProjectFolder(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsCopyToProject, (_event, payload) => assetHandlers.copyAssetToProject(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageOpen, () => projectHandlers.openProjectPackage());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageOpenRecent, (_event, filePath) => projectHandlers.openRecentProjectPackage(filePath));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageSave, (_event, payload) => projectHandlers.saveProjectPackage(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageRecentList, () => projectHandlers.getRecentProjects());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageRecentAdd, (_event, project) => projectHandlers.addRecentProject(project));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageRecentSave, (_event, project) => projectHandlers.saveRecentProject(project));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageRecentRemove, (_event, filePath) => projectHandlers.removeRecentProject(filePath));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageRecentRename, (_event, payload) => projectHandlers.renameRecentProject(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectPackageRecentDuplicate, (_event, filePath) => projectHandlers.duplicateRecentProject(filePath));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectOpen, () => projectHandlers.openProject());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.projectSave, (_event, payload) => projectHandlers.saveProject(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.licenseStatusGet, () => licenseHandlers.getLicenseStatus());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.licenseStatusSave, (_event, input) => licenseHandlers.saveLicenseStatus(input));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.licenseStatusClear, () => licenseHandlers.clearLicenseStatus());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.updateCheck, () => updateHandlers.checkForUpdates());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.updateDownload, () => updateHandlers.downloadUpdate());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.updateInstall, () => updateHandlers.installUpdate());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.renderVideoLocal, (_event, project, options) => renderHandlers.renderVideoLocal(project, options));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.renderStart, (_event, project, options) => renderHandlers.startRender(project, options));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.renderStatus, (_event, renderId) => renderHandlers.getRenderStatus(renderId));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  void createMainWindow();
});

app.on("window-all-closed", () => {
  if (nextServer) nextServer.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
});
