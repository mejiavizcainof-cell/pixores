import { spawn } from "node:child_process";
import electronPath from "electron";
import waitOn from "wait-on";

const appUrl = process.env.PIXORES_DESKTOP_URL || "http://localhost:3000/video-maker";
const isWindows = process.platform === "win32";

async function isUrlReady(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

async function main() {
  let nextProcess = null;

  if (await isUrlReady(appUrl)) {
    console.log(`[pixores-desktop] Reusing Next.js at ${appUrl}`);
  } else {
    console.log("[pixores-desktop] Starting Next.js dev server...");
    nextProcess = spawnProcess(isWindows ? "npm.cmd" : "npm", ["run", "dev"]);

    await waitOn({
      resources: [appUrl],
      timeout: 120000,
      interval: 750,
    });
  }

  console.log(`[pixores-desktop] Opening Electron at ${appUrl}`);
  const electronProcess = spawnProcess(electronPath, ["desktop/electron/main.mjs"], {
    env: {
      ...process.env,
      PIXORES_DESKTOP_DEV: "1",
      PIXORES_DESKTOP_URL: appUrl,
    },
  });

  const cleanup = () => {
    if (nextProcess && !nextProcess.killed) nextProcess.kill();
  };

  process.on("SIGINT", () => {
    cleanup();
    electronProcess.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cleanup();
    electronProcess.kill();
    process.exit(0);
  });

  electronProcess.on("exit", (code) => {
    cleanup();
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error(`[pixores-desktop] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
