import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import {
  createAudioStudioService,
  isPrivateNetworkAddress,
  parseMyInstantsPage,
  sanitizeAudioFilename,
} from "../desktop/electron/services/audio-studio.mjs";

const runtimeRequire = createRequire(import.meta.url);

const linkBundle = await build({
  entryPoints: ["src/audio-studio/links.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const linkModuleUrl = `data:text/javascript;base64,${Buffer.from(linkBundle.outputFiles[0].text).toString("base64")}`;
const { mergeAudioLinks, parseAudioLinks } = await import(linkModuleUrl);

const firstLink = "https://www.myinstants.com/en/instant/first/";
const secondLink = "https://example.com/second.mp3";
assert.deepEqual(
  parseAudioLinks(`${firstLink}${secondLink}\n${firstLink}`),
  [firstLink, secondLink],
  "pasted links must become separate deduplicated rows even when two URLs touch",
);
assert.deepEqual(
  mergeAudioLinks([firstLink], [secondLink, firstLink]),
  [firstLink, secondLink],
  "the link list must preserve its order without duplicate downloads",
);
const audioStudioUi = await fs.readFile("components/AudioStudio.tsx", "utf8");
assert.match(audioStudioUi, /onPaste=\{handleLinkPaste\}/, "Ctrl+V and native paste must create structured link rows");
assert.match(audioStudioUi, /onContextMenu=\{openPasteMenu\}/, "right-click must expose the Audio Studio paste action");
assert.match(audioStudioUi, /ClipboardPaste size=\{16\} \/> Paste/, "Audio Studio must provide a visible Paste button");
assert.match(audioStudioUi, /aria-label=\{`Remove link \$\{index \+ 1\}`\}/, "every pasted link row must have its own remove control");
assert.match(audioStudioUi, /Back to start/, "Audio Studio must provide a visible way back to the desktop start screen");
assert.match(audioStudioUi, /router\.push\("\/video-maker\/start\?desktop=1"\)/, "closing Audio Studio must return home without closing Pixores");

function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr)));
  });
}

async function waitForJobs(service, ids, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const jobs = service.listJobs().jobs.filter((job) => ids.includes(job.id));
    if (jobs.length === ids.length && jobs.every((job) => ["completed", "failed", "cancelled"].includes(job.status))) return jobs;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Audio Studio test jobs did not finish in time.");
}

assert.equal(sanitizeAudioFilename('  bad<>:"/\\|?* name...  '), "bad name");
assert.equal(isPrivateNetworkAddress("127.0.0.1"), true);
assert.equal(isPrivateNetworkAddress("192.168.1.2"), true);
assert.equal(isPrivateNetworkAddress("8.8.8.8"), false);
assert.deepEqual(
  parseMyInstantsPage(
    '<h1 id="instant-page-title">Chicken on tree screaming</h1><a href="/media/sounds/chicken.mp3" download>Download MP3</a>',
    "https://www.myinstants.com/en/instant/chicken/",
  ),
  { title: "Chicken on tree screaming", audioUrl: "https://www.myinstants.com/media/sounds/chicken.mp3" },
);

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-audio-studio-test-"));
try {
  const inputPath = path.join(tempRoot, "tone.wav");
  const outputDirectory = path.join(tempRoot, "output");
  await fs.mkdir(outputDirectory, { recursive: true });
  await run(String(runtimeRequire("ffmpeg-static")), ["-hide_banner", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:a", "pcm_s16le", "-y", inputPath]);

  const service = createAudioStudioService({
    app: { getPath: () => outputDirectory },
    dialog: {
      showOpenDialog: async (options) => options.properties.includes("multiSelections")
        ? { canceled: false, filePaths: [inputPath] }
        : { canceled: false, filePaths: [outputDirectory] },
    },
    shell: { showItemInFolder: () => undefined },
  });
  const capabilities = await service.getCapabilities();
  assert(capabilities.formats.some((format) => format.id === "mp3"));
  const chosen = await service.chooseFiles();
  assert.equal(chosen.files.length, 1);
  await service.chooseOutputDirectory();
  const started = await service.startConversions({
    files: [{ sourcePath: inputPath }], outputDirectory, formatId: "mp3", bitrateKbps: 128,
    sampleRate: 44_100, channels: 2, normalize: false,
  });
  const converted = await waitForJobs(service, started.jobs.map((job) => job.id));
  assert.equal(converted[0].status, "completed", converted[0].error);
  assert.equal(path.extname(converted[0].outputPath), ".mp3");
  assert((await fs.stat(converted[0].outputPath)).size > 0);

  if (process.env.PIXORES_AUDIO_STUDIO_NETWORK_TEST === "1") {
    const downloaded = await service.startDownloads({
      urls: [
        "https://www.myinstants.com/en/instant/chicken-on-tree-screaming-53890/",
        "https://www.myinstants.com/media/sounds/chicken-on-tree-screaming.mp3?pixores-test=simultaneous-1",
        "https://www.myinstants.com/media/sounds/chicken-on-tree-screaming.mp3?pixores-test=simultaneous-2",
      ],
      outputDirectory,
      concurrency: 3,
      rightsAccepted: true,
    });
    const results = await waitForJobs(service, downloaded.jobs.map((job) => job.id), 60_000);
    assert.equal(results.length, 3);
    assert(results.every((job) => job.status === "completed"), results.map((job) => job.error).join("\n"));
    assert(results.every((job) => path.extname(job.outputPath) === ".mp3"));
    assert.equal(new Set(results.map((job) => job.outputPath)).size, 3);
  }

  console.log("Audio Studio tests passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
