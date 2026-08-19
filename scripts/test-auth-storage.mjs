import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDesktopAuthStorage } from "../desktop/electron/services/auth-storage.mjs";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-auth-storage-test-"));
const authPath = path.join(tempRoot, "pixores-auth-session.bin");
const storageKey = "sb-pixores-auth-token";
const sessionValue = JSON.stringify({ access_token: "secret-session-token" });

const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`encrypted:${Buffer.from(value).toString("base64")}`),
  decryptString: (value) => {
    const serialized = value.toString("utf8");
    if (!serialized.startsWith("encrypted:")) throw new Error("Invalid encrypted value");
    return Buffer.from(serialized.slice("encrypted:".length), "base64").toString("utf8");
  },
};

try {
  const storage = createDesktopAuthStorage({ app: { getPath: () => tempRoot }, safeStorage });
  await storage.setItem(storageKey, sessionValue);
  assert.equal(await storage.getItem(storageKey), sessionValue);
  const encryptedContents = await fs.readFile(authPath, "utf8");
  assert.match(encryptedContents, /^encrypted:/);
  assert(!encryptedContents.includes("secret-session-token"), "the desktop session must never be written in plaintext");

  await storage.removeItem(storageKey);
  assert.equal(await storage.getItem(storageKey), null);
  await assert.rejects(() => storage.setItem("invalid-key", sessionValue), /Invalid Pixores authentication storage key/);

  await fs.writeFile(authPath, `plain:${JSON.stringify({ [storageKey]: sessionValue })}`);
  assert.equal(await storage.getItem(storageKey), sessionValue, "legacy plaintext sessions must migrate once encryption is available");
  const migratedContents = await fs.readFile(authPath, "utf8");
  assert.match(migratedContents, /^encrypted:/);
  assert(!migratedContents.includes("secret-session-token"));

  const unavailableStorage = createDesktopAuthStorage({
    app: { getPath: () => path.join(tempRoot, "unavailable") },
    safeStorage: { ...safeStorage, isEncryptionAvailable: () => false },
  });
  await assert.rejects(() => unavailableStorage.setItem(storageKey, sessionValue), /Secure Windows credential encryption is unavailable/);

  console.log("Desktop authentication storage encryption and legacy migration tests passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
