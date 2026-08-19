import fs from "node:fs/promises";
import path from "node:path";

const AUTH_FILE_NAME = "pixores-auth-session.bin";
const PLAIN_TEXT_PREFIX = "plain:";

function assertAuthStorageKey(value) {
  const key = String(value || "");
  if (!/^sb-[a-z0-9-]+-auth-token(?:-code-verifier|-user)?$/i.test(key)) {
    throw new Error("Invalid Pixores authentication storage key.");
  }
  return key;
}

export function createDesktopAuthStorage({ app, safeStorage }) {
  const filePath = path.join(app.getPath("userData"), AUTH_FILE_NAME);
  let pendingWrite = Promise.resolve();

  async function readStore() {
    try {
      const contents = await fs.readFile(filePath);
      const serialized = contents.toString("utf8");
      const isLegacyPlainText = serialized.startsWith(PLAIN_TEXT_PREFIX);
      if (isLegacyPlainText && !safeStorage.isEncryptionAvailable()) return {};
      const json = isLegacyPlainText
        ? serialized.slice(PLAIN_TEXT_PREFIX.length)
        : safeStorage.decryptString(contents);
      const parsed = JSON.parse(json);
      const store = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      if (isLegacyPlainText) await writeStore(store);
      return store;
    } catch (error) {
      if (error?.code === "ENOENT") return {};
      return {};
    }
  }

  async function writeStore(store) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Secure Windows credential encryption is unavailable. Pixores will not persist the account session.");
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const serialized = JSON.stringify(store);
    const contents = safeStorage.encryptString(serialized);
    await fs.writeFile(filePath, contents);
  }

  function updateStore(update) {
    pendingWrite = pendingWrite.then(async () => {
      const store = await readStore();
      await writeStore(update(store));
    });
    return pendingWrite;
  }

  return {
    async getItem(rawKey) {
      const key = assertAuthStorageKey(rawKey);
      await pendingWrite;
      const store = await readStore();
      return typeof store[key] === "string" ? store[key] : null;
    },

    async setItem(rawKey, rawValue) {
      const key = assertAuthStorageKey(rawKey);
      const value = String(rawValue || "");
      await updateStore((store) => ({ ...store, [key]: value }));
      return { ok: true };
    },

    async removeItem(rawKey) {
      const key = assertAuthStorageKey(rawKey);
      await updateStore((store) => {
        const nextStore = { ...store };
        delete nextStore[key];
        return nextStore;
      });
      return { ok: true };
    },
  };
}
