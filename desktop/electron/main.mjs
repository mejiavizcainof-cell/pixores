import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from "electron";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PIXORES_DESKTOP_CHANNELS } from "./ipc-contract.mjs";
import { registerMediaProtocol, registerMediaSchemeAsPrivileged } from "./media-protocol.mjs";
import { createDesktopAssetHandlers } from "./services/asset-adapter.mjs";
import { createDesktopLicenseHandlers } from "./services/license-status.mjs";
import { createDesktopProjectHandlers } from "./services/project-package.mjs";
import { createDesktopRenderHandlers } from "./services/render-adapter.mjs";
import { createAudioAiHandlers } from "./services/audio-ai.mjs";
import { createAudioSyncHandlers } from "./services/audio-sync.mjs";
import { createAudioStudioService } from "./services/audio-studio.mjs";
import { createDesktopUpdateHandlers } from "./services/update-service.mjs";
import { createDesktopAutoSaveHandlers } from "./services/autosave.mjs";
import { createElementLibraryHandlers } from "./services/element-library.mjs";
import { createDownloadImageWatcher } from "./services/download-image-watcher.mjs";
import { createImageAiHandlers } from "./services/image-ai.mjs";
import { createDesktopAuthStorage } from "./services/auth-storage.mjs";
import { createYouTubePublisher } from "./services/youtube-publisher.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.PIXORES_DESKTOP_DEV === "1";
const isStartupSmokeTest = process.argv.includes("--pixores-startup-smoke-test");
const nextDevUrl = process.env.PIXORES_DESKTOP_URL || "http://localhost:3000/video-maker/start?desktop=1";

let mainWindow;
let nextServer;
let projectHasUnsavedChanges = false;
let closeRequestPending = false;
let allowMainWindowClose = false;
const hasSingleInstanceLock = app.requestSingleInstanceLock();
const desktopState = {
  packagePath: "",
  projectFolder: "",
  assetsRoot: "",
  workingProjectId: "",
  renderOutputDirectory: "",
};

registerMediaSchemeAsPrivileged();

if (!hasSingleInstanceLock) app.quit();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function writeStartupLog(message) {
  try {
    const logDirectory = app.getPath("logs");
    await fs.mkdir(logDirectory, { recursive: true });
    await fs.appendFile(
      path.join(logDirectory, "pixores-startup.log"),
      `[${new Date().toISOString()}] ${message}\n`,
      "utf8",
    );
  } catch (error) {
    console.error("[pixores-desktop] Could not write the startup log.", error);
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function createStartupErrorUrl(error) {
  const details = error instanceof Error ? error.stack || error.message : String(error);
  const logPath = path.join(app.getPath("logs"), "pixores-startup.log");
  const html = `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pixores no pudo iniciar</title>
        <style>
          :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #07111f; color: #e8f0ff; }
          main { width: min(720px, calc(100vw - 48px)); padding: 32px; border: 1px solid #243550; border-radius: 20px; background: #0e1b2e; box-shadow: 0 24px 80px #0008; }
          h1 { margin: 0 0 12px; font-size: 28px; }
          p { color: #b8c7dc; line-height: 1.55; }
          code, pre { font-family: Consolas, monospace; }
          code { color: #d7e6ff; }
          pre { max-height: 240px; overflow: auto; margin-top: 20px; padding: 16px; border-radius: 12px; background: #07111f; color: #ffb9b9; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <main>
          <h1>Pixores could not start</h1>
          <p>The app encountered a problem while preparing the editor. Close this window and reopen Pixores.</p>
          <p>The diagnostic log was saved to <code>${escapeHtml(logPath)}</code>.</p>
          <pre>${escapeHtml(details)}</pre>
        </main>
      </body>
    </html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function getAppRoot() {
  return app.isPackaged ? app.getAppPath() : process.cwd();
}

async function configureWritableRuntimeDirectory() {
  if (!app.isPackaged) return;
  const localAppData = process.env.LOCALAPPDATA || app.getPath("userData");
  const runtimeDirectory = path.join(localAppData, "Pixores Desktop", "runtime");
  await fs.mkdir(runtimeDirectory, { recursive: true });
  const writeProbe = path.join(runtimeDirectory, ".write-test");
  await fs.writeFile(writeProbe, "ok", "utf8");
  await fs.rm(writeProbe, { force: true });
  process.chdir(runtimeDirectory);
}

async function findLegacyEditorPort() {
  const levelDbDir = path.join(app.getPath("userData"), "Local Storage", "leveldb");
  try {
    const files = await fs.readdir(levelDbDir, { withFileTypes: true });
    const candidates = [];
    for (const file of files) {
      if (!file.isFile() || !/\.(?:log|ldb)$/i.test(file.name)) continue;
      const filePath = path.join(levelDbDir, file.name);
      const [contents, stat] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
      const text = contents.toString("latin1");
      if (!text.includes("pixores-video-maker-autosave-v1")) continue;
      const ports = Array.from(text.matchAll(/_http:\/\/127\.0\.0\.1:(\d+)/g), (match) => Number(match[1]));
      for (const port of ports) {
        if (Number.isInteger(port) && port >= 1024 && port <= 65535) candidates.push({ port, modifiedAt: stat.mtimeMs });
      }
    }
    return candidates.sort((first, second) => second.modifiedAt - first.modifiedAt)[0]?.port || null;
  } catch {
    return null;
  }
}

async function getPreferredEditorPort() {
  const statePath = path.join(app.getPath("userData"), "desktop-server.json");
  try {
    const saved = JSON.parse(await fs.readFile(statePath, "utf8"));
    const port = Number(saved?.port);
    if (Number.isInteger(port) && port >= 1024 && port <= 65535) return { port, statePath };
  } catch {
    // Existing beta builds did not persist the editor port.
  }
  return { port: await findLegacyEditorPort() || 43192, statePath };
}

async function listenForEditor(server, preferredPort) {
  const listen = (port) => new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });

  try {
    await listen(preferredPort);
  } catch (error) {
    if (error?.code !== "EADDRINUSE") throw error;
    await listen(0);
  }
}

async function startPackagedNextServer() {
  await writeStartupLog(`Preparing Next.js from ${getAppRoot()}`);
  const nextModule = await import("next");
  const next = nextModule.default;
  const nextApp = next({
    dev: false,
    dir: getAppRoot(),
    hostname: "127.0.0.1",
  });
  const handle = nextApp.getRequestHandler();

  await withTimeout(nextApp.prepare(), 45_000, "Next.js did not finish preparing within 45 seconds.");

  nextServer = http.createServer((request, response) => {
    void handle(request, response);
  });

  const { port: preferredPort, statePath } = await getPreferredEditorPort();
  await listenForEditor(nextServer, preferredPort);

  const address = nextServer.address();
  const port = typeof address === "object" && address ? address.port : 3000;
  await fs.writeFile(statePath, JSON.stringify({ port }, null, 2), "utf8");
  await writeStartupLog(`Editor server listening on 127.0.0.1:${port}`);
  return `http://127.0.0.1:${port}/video-maker/start?desktop=1`;
}

async function runStartupSmokeTest() {
  const targetUrl = await startPackagedNextServer();
  const response = await withTimeout(fetch(targetUrl), 15_000, "The editor did not answer the startup health check.");
  if (!response.ok) throw new Error(`The editor answered the startup health check with HTTP ${response.status}.`);
  await response.text();
  await writeStartupLog(`Startup smoke test passed for ${targetUrl}`);
  console.log(`[pixores-desktop] startup smoke test passed: ${targetUrl}`);
  await new Promise((resolve, reject) => {
    nextServer.close((error) => (error ? reject(error) : resolve()));
  });
  nextServer = undefined;
}

async function createMainWindow() {
  projectHasUnsavedChanges = false;
  closeRequestPending = false;
  allowMainWindowClose = false;
  mainWindow = new BrowserWindow({
    title: "Pixores Video Maker Pro",
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
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
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow.setTitle("Pixores Video Maker Pro");
  });

  mainWindow.on("close", (event) => {
    if (allowMainWindowClose || mainWindow.webContents.isDestroyed()) return;
    const currentUrl = mainWindow.webContents.getURL();
    const isEditingWorkspace = currentUrl.includes("/video-maker") && !currentUrl.includes("/video-maker/start");
    if (!isEditingWorkspace && !projectHasUnsavedChanges) return;
    event.preventDefault();
    if (closeRequestPending) return;
    closeRequestPending = true;
    mainWindow.webContents.send(PIXORES_DESKTOP_CHANNELS.windowCloseRequested);
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
    projectHasUnsavedChanges = false;
    closeRequestPending = false;
    allowMainWindowClose = false;
  });

  mainWindow.webContents.on("did-finish-load", async () => {
    const hasDesktopBridge = await mainWindow.webContents.executeJavaScript("Boolean(window.pixoresDesktop)");
    console.log(`[pixores-desktop] window.pixoresDesktop ${hasDesktopBridge ? "ready" : "missing"}`);
  });

  try {
    const targetUrl = isDev ? nextDevUrl : await startPackagedNextServer();
    await mainWindow.loadURL(targetUrl);
  } catch (error) {
    const details = error instanceof Error ? error.stack || error.message : String(error);
    await writeStartupLog(`Startup failed: ${details}`);
    console.error("[pixores-desktop] Startup failed.", error);
    await mainWindow.loadURL(createStartupErrorUrl(error));
    mainWindow.show();
  }
}

function registerIpcHandlers() {
  const assertMainWindowSender = (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      throw new Error("The request did not originate from the Pixores application window.");
    }
  };
  const assetHandlers = createDesktopAssetHandlers({ app, dialog, state: desktopState });
  const licenseHandlers = createDesktopLicenseHandlers({ app });
  const projectHandlers = createDesktopProjectHandlers({
    app,
    dialog,
    state: desktopState,
    getMainWindow: () => mainWindow,
  });
  const renderHandlers = createDesktopRenderHandlers({ app, state: desktopState, appRoot: getAppRoot() });
  const audioAiHandlers = createAudioAiHandlers({ app });
  const audioSyncHandlers = createAudioSyncHandlers();
  const updateHandlers = createDesktopUpdateHandlers({ app });
  const autoSaveHandlers = createDesktopAutoSaveHandlers({ app });
  const elementLibraryHandlers = createElementLibraryHandlers({ app });
  const downloadImageWatcher = createDownloadImageWatcher({ app });
  const audioStudio = createAudioStudioService({ app, dialog, shell });
  const imageAiHandlers = createImageAiHandlers();
  const authStorage = createDesktopAuthStorage({ app, safeStorage });
  const youtubePublisher = createYouTubePublisher({ app, dialog, safeStorage, shell });

  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsImport, (_event, payload) => assetHandlers.importAsset(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsChooseProjectFolder, (_event, payload) => assetHandlers.chooseProjectFolder(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsCopyToProject, (_event, payload) => assetHandlers.copyAssetToProject(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.assetsPrepare, (_event, payload) => assetHandlers.prepareAsset(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.elementLibraryList, (_event, userKey) => elementLibraryHandlers.list(userKey));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.elementLibrarySave, (_event, payload) => elementLibraryHandlers.save(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.elementLibraryRemove, (_event, payload) => elementLibraryHandlers.remove(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.downloadsListRecentImages, (_event, payload) => downloadImageWatcher.listRecent(payload));
  const sendAudioStudioProgress = (event) => (progress) => {
    if (!event.sender.isDestroyed()) event.sender.send(PIXORES_DESKTOP_CHANNELS.audioStudioProgress, progress);
  };
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioCapabilities, () => audioStudio.getCapabilities());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioChooseFiles, () => audioStudio.chooseFiles());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioChooseOutputDirectory, () => audioStudio.chooseOutputDirectory());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioStartConversions, (event, payload) => audioStudio.startConversions(payload, sendAudioStudioProgress(event)));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioStartDownloads, (event, payload) => audioStudio.startDownloads(payload, sendAudioStudioProgress(event)));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioListJobs, () => audioStudio.listJobs());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioCancelJob, (_event, jobId) => audioStudio.cancelJob(jobId));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioRetryJob, (event, jobId) => audioStudio.retryJob(jobId, sendAudioStudioProgress(event)));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioStudioRevealOutput, (_event, filePath) => audioStudio.revealOutput(filePath));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.imageAiRemoveBackground, (_event, payload) => imageAiHandlers.removeBackground(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.authStorageGet, (event, key) => {
    assertMainWindowSender(event);
    return authStorage.getItem(key);
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.authStorageSet, (event, key, value) => {
    assertMainWindowSender(event);
    return authStorage.setItem(key, value);
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.authStorageRemove, (event, key) => {
    assertMainWindowSender(event);
    return authStorage.removeItem(key);
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.autoSaveLoad, () => autoSaveHandlers.load());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.autoSaveSave, (_event, contents) => autoSaveHandlers.save(contents));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.autoSaveClear, () => autoSaveHandlers.clear());
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
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.renderCancel, (_event, renderId) => renderHandlers.cancelRender(renderId));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioAiDetectSilences, (_event, payload) => audioAiHandlers.detectSilences(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioAiTranscribe, (event, payload) => audioAiHandlers.transcribeMedia(payload, (progress) => {
    if (!event.sender.isDestroyed()) event.sender.send(PIXORES_DESKTOP_CHANNELS.audioAiProgress, progress);
  }));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioAiCancel, (_event, jobId) => audioAiHandlers.cancelTranscription(jobId));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.audioSync, (_event, payload) => audioSyncHandlers.synchronize(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubeStatus, () => youtubePublisher.getStatus());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubeConfigure, (_event, payload) => youtubePublisher.configure(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubeConnect, (_event, payload) => youtubePublisher.connect(payload));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubeDisconnect, () => youtubePublisher.disconnect());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubeChooseVideo, () => youtubePublisher.chooseVideo());
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubePublish, (event, payload) => youtubePublisher.publish(payload, (progress) => {
    if (!event.sender.isDestroyed()) event.sender.send(PIXORES_DESKTOP_CHANNELS.youtubeProgress, progress);
  }));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.youtubeCancel, (_event, jobId) => youtubePublisher.cancel(jobId));
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.renderChooseOutputDirectory, async () => {
    const result = await dialog.showOpenDialog({
      title: "Choose video export folder",
      defaultPath: desktopState.renderOutputDirectory || app.getPath("downloads"),
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
    desktopState.renderOutputDirectory = result.filePaths[0];
    return { ok: true, canceled: false, directory: result.filePaths[0] };
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.renderSaveOutput, async (_event, payload = {}) => {
    const outputDirectory = String(payload.outputDirectory || desktopState.renderOutputDirectory || app.getPath("downloads"));
    const fileName = path.basename(String(payload.fileName || "pixores-video.webm"));
    const outputPath = path.join(outputDirectory, fileName);
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(payload.bytes));
    return { ok: true, outputPath };
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.systemOpenExternalUrl, async (_event, value) => {
    const url = String(value || "");
    if (!/^https:\/\//i.test(url)) throw new Error("Only secure Pixores web links can be opened.");
    await shell.openExternal(url);
    return { ok: true };
  });
  ipcMain.on(PIXORES_DESKTOP_CHANNELS.windowProjectDirty, (event, dirty) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return;
    projectHasUnsavedChanges = Boolean(dirty);
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.windowCloseRequest, () => {
    const prompted = Boolean(mainWindow && projectHasUnsavedChanges && !allowMainWindowClose);
    mainWindow?.close();
    return { ok: true, prompted };
  });
  ipcMain.handle(PIXORES_DESKTOP_CHANNELS.windowCloseResponse, (_event, response) => {
    if (response === "cancel") {
      closeRequestPending = false;
      return { ok: true };
    }
    if (response !== "close") throw new Error("Unknown Pixores close response.");
    closeRequestPending = false;
    allowMainWindowClose = true;
    mainWindow?.close();
    return { ok: true };
  });
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  try {
    Menu.setApplicationMenu(null);
    await writeStartupLog(`Starting Pixores ${app.getVersion()} (packaged=${app.isPackaged})`);
    await configureWritableRuntimeDirectory();
    registerMediaProtocol();
    registerIpcHandlers();
    if (isStartupSmokeTest) {
      await runStartupSmokeTest();
      app.quit();
      return;
    }
    await createMainWindow();
  } catch (error) {
    const details = error instanceof Error ? error.stack || error.message : String(error);
    await writeStartupLog(`Fatal startup failure: ${details}`);
    if (isStartupSmokeTest) {
      console.error("[pixores-desktop] startup smoke test failed.", error);
      app.exit(1);
      return;
    }
    dialog.showErrorBox(
      "Pixores could not start",
      `The app encountered a problem before opening the editor.\n\n${details}`,
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (nextServer) nextServer.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
});
