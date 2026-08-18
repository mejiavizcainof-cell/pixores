import fs from "node:fs/promises";
import path from "node:path";

export function createDesktopAutoSaveHandlers({ app }) {
  const recoveryPath = path.join(app.getPath("userData"), "recovery", "video-maker-autosave.json");

  return {
    async load() {
      try {
        return { ok: true, contents: JSON.parse(await fs.readFile(recoveryPath, "utf8")) };
      } catch (error) {
        if (error?.code === "ENOENT") return { ok: true, contents: null };
        throw error;
      }
    },
    async save(contents) {
      await fs.mkdir(path.dirname(recoveryPath), { recursive: true });
      const temporaryPath = `${recoveryPath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(contents));
      await fs.rename(temporaryPath, recoveryPath).catch(async () => {
        await fs.rm(recoveryPath, { force: true });
        await fs.rename(temporaryPath, recoveryPath);
      });
      return { ok: true, savedAt: new Date().toISOString() };
    },
    async clear() {
      await fs.rm(recoveryPath, { force: true });
      return { ok: true };
    },
  };
}
