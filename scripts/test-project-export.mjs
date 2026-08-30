import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDesktopProjectHandlers } from "../desktop/electron/services/project-package.mjs";

const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-project-export-"));
const documentsDir = path.join(testRoot, "Documents");
const userDataDir = path.join(testRoot, "UserData");
const outputPath = path.join(documentsDir, "Pixores Video Projects", "export-test.pixores-video");
const renamedOutputPath = path.join(documentsDir, "Pixores Video Projects", "Entrevista Juan.pixores-video");
const parentWindow = { isDestroyed: () => false };
const calls = [];
let nextSavePath = outputPath;

const app = {
  getPath(name) {
    if (name === "documents") return documentsDir;
    if (name === "userData") return userDataDir;
    throw new Error(`Unexpected app path: ${name}`);
  },
};

const dialog = {
  async showSaveDialog(parent, options) {
    calls.push({ type: "save", parent, options });
    return { canceled: false, filePath: nextSavePath };
  },
  async showOpenDialog(parent, options) {
    calls.push({ type: "open", parent, options });
    return { canceled: false, filePaths: [outputPath] };
  },
};

try {
  const state = {};
  const handlers = createDesktopProjectHandlers({
    app,
    dialog,
    state,
    getMainWindow: () => parentWindow,
  });

  const project = {
    version: 1,
    duration: 4,
    canvas: { width: 1920, height: 1080, background: "#000000" },
    assets: [],
    layers: [],
  };
  const saved = await handlers.saveProjectPackage({ title: "Export Test", project });
  assert.equal(saved.canceled, false);
  assert.equal(saved.filePath, outputPath);
  assert.equal(calls[0].parent, parentWindow, "Save dialog must be modal to the Pixores window");
  assert.equal(calls[0].options.title, "Save Pixores video project");

  const written = JSON.parse(await fs.readFile(outputPath, "utf8"));
  assert.equal(written.format, "pixores-video-package");
  assert.equal(written.metadata.title, "Export Test");
  assert.deepEqual(written.project, project);

  nextSavePath = renamedOutputPath;
  const smartClipProject = {
    ...project,
    smartClipProjectVersion: 1,
    smartClipWorkspace: { title: "Smart Clips project", sourceProject: project, candidates: [], settings: {} },
  };
  const renamed = await handlers.saveProjectPackage({ title: "Smart Clips project", project: smartClipProject });
  assert.equal(renamed.metadata.title, "Entrevista Juan", "an explicit Save As filename must become the Recent project title");
  const renamedWritten = JSON.parse(await fs.readFile(renamedOutputPath, "utf8"));
  assert.equal(renamedWritten.metadata.title, "Entrevista Juan");
  assert.equal(renamedWritten.project.smartClipWorkspace.title, "Entrevista Juan", "Smart Clips must reopen with the chosen title");

  nextSavePath = outputPath;
  const opened = await handlers.openProjectPackage();
  assert.equal(opened.canceled, false);
  assert.equal(calls[2].parent, parentWindow, "Open dialog must be modal to the Pixores window");
  assert.equal(opened.project.canvas.width, 1920);

  console.log("Project export test passed: native dialog is attached and the project package is readable.");
} finally {
  await fs.rm(testRoot, { recursive: true, force: true });
}
