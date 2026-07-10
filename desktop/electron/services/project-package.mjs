import fs from "node:fs/promises";
import path from "node:path";

const PACKAGE_FORMAT = "pixores-video-package";
const PACKAGE_VERSION = 1;

function createMetadata(title) {
  const now = new Date().toISOString();
  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    projectFile: "project.json",
    assetsDir: "assets",
    title: String(title || "Untitled video").trim() || "Untitled video",
    createdAt: now,
    updatedAt: now,
  };
}

function safePackageName(title) {
  return `${String(title || "untitled-video")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "untitled-video"}.pixores-video`;
}

function splitPackageName(filePath) {
  return path.basename(filePath, ".pixores-video");
}

function normalizePackagePath(filePath) {
  return filePath.endsWith(".pixores-video") ? filePath : `${filePath}.pixores-video`;
}

function getAssetsRootFromPackagePath(packagePath) {
  const parsed = path.parse(packagePath);
  return path.join(parsed.dir, `${parsed.name}_assets`);
}

async function ensureAssetFolders(assetsRoot) {
  await fs.mkdir(path.join(assetsRoot, "images"), { recursive: true });
  await fs.mkdir(path.join(assetsRoot, "videos"), { recursive: true });
  await fs.mkdir(path.join(assetsRoot, "audio"), { recursive: true });
}

async function setCurrentPackageState(state, packagePath) {
  state.packagePath = packagePath;
  state.projectFolder = path.dirname(packagePath);
  state.assetsRoot = getAssetsRootFromPackagePath(packagePath);
  await ensureAssetFolders(state.assetsRoot);
}

function createPackagePayload(payload) {
  const metadata = createMetadata(payload.title);
  const project = payload.project;

  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    metadata,
    project,
    assets: Array.isArray(project?.assets)
      ? project.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        url: asset.url,
        persistentUrl: asset.persistentUrl,
      }))
      : [],
  };
}

function parseProjectPackage(contents) {
  const parsed = JSON.parse(contents);

  if (parsed?.format !== PACKAGE_FORMAT || parsed?.version !== PACKAGE_VERSION || !parsed?.project) {
    throw new Error("Invalid .pixores-video file.");
  }

  return parsed;
}

function createDuplicateTitle(title) {
  const cleanTitle = String(title || "Untitled video").trim() || "Untitled video";
  return /\bcopy\b/i.test(cleanTitle) ? `${cleanTitle} 2` : `${cleanTitle} Copy`;
}

async function createUniquePackagePath(sourcePath, title) {
  const parsed = path.parse(sourcePath);
  const baseName = path.basename(safePackageName(title), ".pixores-video");
  let candidate = path.join(parsed.dir, `${baseName}.pixores-video`);
  let index = 2;

  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(parsed.dir, `${baseName}-${index}.pixores-video`);
      index += 1;
    } catch {
      return candidate;
    }
  }
}

function getRecentProjectFromPackage(filePath, packagePayload) {
  const project = packagePayload.project || {};
  return {
    filePath,
    title: packagePayload.metadata?.title || project.format?.label || path.parse(filePath).name,
    updatedAt: packagePayload.metadata?.updatedAt || project.updatedAt || new Date().toISOString(),
    formatLabel: project.format?.label,
    width: project.canvas?.width,
    height: project.canvas?.height,
  };
}

function cleanRecentProject(project) {
  if (!project?.filePath) return null;

  return {
    filePath: String(project.filePath),
    title: String(project.title || path.parse(String(project.filePath)).name || "Untitled video"),
    updatedAt: String(project.updatedAt || new Date().toISOString()),
    formatLabel: project.formatLabel ? String(project.formatLabel) : undefined,
    width: Number.isFinite(project.width) ? Number(project.width) : undefined,
    height: Number.isFinite(project.height) ? Number(project.height) : undefined,
  };
}

export function createDesktopProjectHandlers({ app, dialog, state }) {
  const projectsDir = path.join(app.getPath("documents"), "Pixores Video Projects");
  const recentsPath = path.join(app.getPath("userData"), "video-maker-recent-projects.json");

  async function readRecentProjects() {
    try {
      const parsed = JSON.parse(await fs.readFile(recentsPath, "utf8"));
      if (!Array.isArray(parsed?.projects)) return [];
      return parsed.projects.map(cleanRecentProject).filter(Boolean).slice(0, 12);
    } catch {
      return [];
    }
  }

  async function writeRecentProjects(projects) {
    await fs.mkdir(path.dirname(recentsPath), { recursive: true });
    await fs.writeFile(recentsPath, JSON.stringify({ projects }, null, 2), "utf8");
  }

  async function upsertRecentProject(project) {
    const cleaned = cleanRecentProject(project);
    if (!cleaned) return { ok: true, projects: await readRecentProjects() };

    const existing = await readRecentProjects();
    const projects = [
      cleaned,
      ...existing.filter((item) => item.filePath !== cleaned.filePath),
    ].slice(0, 12);

    await writeRecentProjects(projects);
    return { ok: true, projects };
  }

  async function removeRecentProjectByPath(filePath) {
    const normalizedPath = String(filePath || "");
    if (!normalizedPath) return { ok: true, projects: await readRecentProjects() };

    const existing = await readRecentProjects();
    const projects = existing.filter((item) => item.filePath !== normalizedPath);
    await writeRecentProjects(projects);
    return { ok: true, projects };
  }

  async function renameRecentProjectByPath(payload) {
    const filePath = String(payload?.filePath || "");
    const title = String(payload?.title || "").trim();
    if (!filePath) throw new Error("filePath is required.");
    if (!title) throw new Error("title is required.");

    const updatedAt = new Date().toISOString();
    let packageRecent = null;

    try {
      const packagePayload = parseProjectPackage(await fs.readFile(filePath, "utf8"));
      packagePayload.metadata = {
        ...createMetadata(title),
        ...(packagePayload.metadata || {}),
        title,
        updatedAt,
      };
      packagePayload.project = {
        ...(packagePayload.project || {}),
        updatedAt,
      };
      await fs.writeFile(filePath, JSON.stringify(packagePayload, null, 2), "utf8");
      packageRecent = getRecentProjectFromPackage(filePath, packagePayload);
    } catch {
      packageRecent = {
        filePath,
        title,
        updatedAt,
      };
    }

    const existing = await readRecentProjects();
    const previous = existing.find((item) => item.filePath === filePath);
    const renamed = cleanRecentProject({
      ...previous,
      ...packageRecent,
      title,
      updatedAt,
    });
    const projects = [
      renamed,
      ...existing.filter((item) => item.filePath !== filePath),
    ].filter(Boolean).slice(0, 12);

    await writeRecentProjects(projects);
    return { ok: true, projects };
  }

  async function duplicateRecentProjectByPath(filePath) {
    if (!filePath) throw new Error("filePath is required.");

    const packagePayload = parseProjectPackage(await fs.readFile(filePath, "utf8"));
    const sourceTitle = packagePayload.metadata?.title || packagePayload.project?.format?.label || splitPackageName(filePath);
    const title = createDuplicateTitle(sourceTitle);
    const now = new Date().toISOString();
    const duplicatePath = await createUniquePackagePath(filePath, title);
    const duplicatePayload = {
      ...packagePayload,
      metadata: {
        ...createMetadata(title),
        ...(packagePayload.metadata || {}),
        title,
        createdAt: now,
        updatedAt: now,
      },
      project: {
        ...(packagePayload.project || {}),
        updatedAt: now,
      },
    };

    await fs.writeFile(duplicatePath, JSON.stringify(duplicatePayload, null, 2), "utf8");
    return upsertRecentProject(getRecentProjectFromPackage(duplicatePath, duplicatePayload));
  }

  async function openPackageAt(filePath) {
    const packagePayload = parseProjectPackage(await fs.readFile(filePath, "utf8"));
    await setCurrentPackageState(state, filePath);
    await upsertRecentProject(getRecentProjectFromPackage(filePath, packagePayload));

    return {
      ok: true,
      canceled: false,
      filePath,
      metadata: packagePayload.metadata,
      project: packagePayload.project,
      assets: packagePayload.assets || [],
    };
  }

  return {
    async saveProjectPackage(payload) {
      if (!payload?.project) {
        throw new Error("project is required.");
      }

      await fs.mkdir(projectsDir, { recursive: true });

      const defaultPath = path.join(projectsDir, safePackageName(payload.title));
      const result = await dialog.showSaveDialog({
        title: "Save Pixores video project",
        defaultPath,
        filters: [
          { name: "Pixores Video Project", extensions: ["pixores-video"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      const packagePath = normalizePackagePath(result.filePath);
      await setCurrentPackageState(state, packagePath);
      const packagePayload = createPackagePayload(payload);

      await fs.writeFile(packagePath, JSON.stringify(packagePayload, null, 2), "utf8");
      await upsertRecentProject(getRecentProjectFromPackage(packagePath, packagePayload));

      return {
        ok: true,
        canceled: false,
        filePath: packagePath,
        metadata: packagePayload.metadata,
      };
    },

    async openProjectPackage() {
      const result = await dialog.showOpenDialog({
        title: "Open Pixores video project",
        properties: ["openFile"],
        filters: [
          { name: "Pixores Video Project", extensions: ["pixores-video"] },
        ],
      });

      if (result.canceled || !result.filePaths?.[0]) {
        return { canceled: true };
      }

      return openPackageAt(result.filePaths[0]);
    },

    async openRecentProjectPackage(filePath) {
      if (!filePath) {
        throw new Error("filePath is required.");
      }

      return openPackageAt(filePath);
    },

    async getRecentProjects() {
      return { ok: true, projects: await readRecentProjects() };
    },

    async addRecentProject(project) {
      return upsertRecentProject(project);
    },

    async saveRecentProject(project) {
      return upsertRecentProject(project);
    },

    async removeRecentProject(filePath) {
      return removeRecentProjectByPath(filePath);
    },

    async renameRecentProject(payload) {
      return renameRecentProjectByPath(payload);
    },

    async duplicateRecentProject(filePath) {
      return duplicateRecentProjectByPath(filePath);
    },

    async saveProject(payload) {
      return this.saveProjectPackage(payload);
    },

    async openProject() {
      return this.openProjectPackage();
    },
  };
}
