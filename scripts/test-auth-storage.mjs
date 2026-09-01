import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDesktopAuthStorage } from "../desktop/electron/services/auth-storage.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");

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
  const diagnostics = [];
  const storage = createDesktopAuthStorage({
    app: { getPath: () => tempRoot },
    safeStorage,
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  });
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

  await fs.writeFile(authPath, "corrupted-encrypted-session");
  assert.equal(await storage.getItem(storageKey), null, "a corrupt encrypted session must fail closed");
  assert.equal(diagnostics.at(-1)?.operation, "read", "desktop auth read failures must be recorded for support diagnostics");

  const unavailableStorage = createDesktopAuthStorage({
    app: { getPath: () => path.join(tempRoot, "unavailable") },
    safeStorage: { ...safeStorage, isEncryptionAvailable: () => false },
  });
  await assert.rejects(() => unavailableStorage.setItem(storageKey, sessionValue), /Secure Windows credential encryption is unavailable/);

  const [mainSource, preloadSource, clientSource, gateSource] = await Promise.all([
    fs.readFile(path.join(projectRoot, "desktop", "electron", "main.mjs"), "utf8"),
    fs.readFile(path.join(projectRoot, "desktop", "electron", "preload.cjs"), "utf8"),
    fs.readFile(path.join(projectRoot, "lib", "supabaseClient.ts"), "utf8"),
    fs.readFile(path.join(projectRoot, "components", "DesktopAuthGate.tsx"), "utf8"),
  ]);
  assert.match(mainSource, /createDesktopAuthStorage\(\{\s*app,\s*safeStorage,/, "Electron must create the encrypted auth store");
  assert.match(mainSource, /desktop-server\.json/, "Electron must persist its local server port across launches");
  assert.match(mainSource, /authStorage\.setItem\(key, value\)/, "Electron must expose auth writes through IPC");
  assert.match(preloadSource, /setAuthStorageItem:\s*\(key, value\)/, "the preload bridge must expose encrypted auth writes");
  assert.match(clientSource, /storage:\s*desktopAuthStorage/, "Supabase must use the desktop auth store");
  assert.match(clientSource, /persistSession:\s*true/, "Supabase desktop sessions must persist");
  assert.match(
    gateSource,
    /event === "INITIAL_SESSION" && !session\) return/,
    "an empty delayed INITIAL_SESSION event must not revoke a newly accepted desktop login",
  );

  console.log("Desktop authentication race prevention, diagnostics, persistence, encryption, migration, and integration tests passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
