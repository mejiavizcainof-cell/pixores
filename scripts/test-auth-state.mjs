import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const projectRoot = path.resolve(import.meta.dirname, "..");
const helperSource = await fs.readFile(path.join(projectRoot, "lib", "authState.ts"), "utf8");
const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { shouldApplyAuthSnapshot } = await import(`data:text/javascript;base64,${Buffer.from(compiledHelper).toString("base64")}`);

const tracker = { hasAuthenticatedSession: false };
assert.equal(shouldApplyAuthSnapshot(tracker, "INITIAL_SESSION", null), true);
assert.equal(tracker.hasAuthenticatedSession, false);

const session = { user: { id: "user-1", email: "person@example.com" } };
assert.equal(shouldApplyAuthSnapshot(tracker, "SIGNED_IN", session), true);
assert.equal(tracker.hasAuthenticatedSession, true);
assert.equal(
  shouldApplyAuthSnapshot(tracker, "INITIAL_SESSION", null),
  false,
  "an old empty initialization snapshot must not replace a successful login",
);
assert.equal(shouldApplyAuthSnapshot(tracker, "TOKEN_REFRESHED", null), false);
assert.equal(tracker.hasAuthenticatedSession, true);
assert.equal(shouldApplyAuthSnapshot(tracker, "SIGNED_OUT", null), true);
assert.equal(tracker.hasAuthenticatedSession, false);

const sessionOwners = [
  "components/AccountPortal.tsx",
  "components/AuthButton.tsx",
  "components/DesktopAuthGate.tsx",
  "components/HeaderAccount.tsx",
  "components/StudioDesktopGate.tsx",
];

for (const relativePath of sessionOwners) {
  const source = await fs.readFile(path.join(projectRoot, relativePath), "utf8");
  assert.match(source, /onAuthStateChange/, `${relativePath} must initialize from the ordered auth event stream`);
  assert.match(source, /shouldApplyAuthSnapshot/, `${relativePath} must reject stale empty auth snapshots`);
  assert.doesNotMatch(
    source,
    /supabase\.auth\.(?:getSession|getUser)\(/,
    `${relativePath} must not race an auth query against the auth event stream`,
  );
}

console.log("Shared web and desktop authentication ordering tests passed.");
