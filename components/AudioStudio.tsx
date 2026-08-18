"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileAudio,
  FolderOpen,
  Gauge,
  ListMusic,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getPixoresDesktopBridge, isPixoresDesktop } from "@/src/video-maker/adapters/runtime";
import type {
  PixoresAudioStudioCapabilities,
  PixoresAudioStudioJob,
  PixoresAudioStudioSourceFile,
} from "@/src/video-maker/adapters/types";
import { PIXORES_VIDEO_START_AUDIO_KEY, type PixoresVideoStartAudioItem } from "@/src/video-maker/startup";
import { mergeAudioLinks, parseAudioLinks } from "@/src/audio-studio/links";
import AudioStudioLanding from "./AudioStudioLanding";
import styles from "./AudioStudio.module.css";

type StudioTab = "convert" | "download";

const activeStatuses = new Set(["queued", "starting", "resolving", "downloading", "converting"]);

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function mergeJobs(current: PixoresAudioStudioJob[], incoming: PixoresAudioStudioJob[]) {
  const byId = new Map(current.map((job) => [job.id, job]));
  incoming.forEach((job) => byId.set(job.id, job));
  return Array.from(byId.values()).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export default function AudioStudio() {
  const router = useRouter();
  const [desktopReady, setDesktopReady] = useState(false);
  const [tab, setTab] = useState<StudioTab>("convert");
  const [capabilities, setCapabilities] = useState<PixoresAudioStudioCapabilities | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<PixoresAudioStudioSourceFile[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [formatId, setFormatId] = useState("mp3");
  const [bitrateKbps, setBitrateKbps] = useState(192);
  const [sampleRate, setSampleRate] = useState(48_000);
  const [channels, setChannels] = useState<1 | 2>(2);
  const [normalize, setNormalize] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [pasteMenu, setPasteMenu] = useState<{ x: number; y: number } | null>(null);
  const [concurrency, setConcurrency] = useState(3);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [jobs, setJobs] = useState<PixoresAudioStudioJob[]>([]);
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);

  const draftLinks = useMemo(() => parseAudioLinks(urlDraft), [urlDraft]);
  const completedJobs = useMemo(() => jobs.filter((job) => job.status === "completed" && job.outputUrl), [jobs]);
  const activeJobCount = useMemo(() => jobs.filter((job) => activeStatuses.has(job.status)).length, [jobs]);

  useEffect(() => {
    const bridge = getPixoresDesktopBridge();
    queueMicrotask(() => setDesktopReady(isPixoresDesktop() && Boolean(bridge?.getAudioStudioCapabilities)));
    if (!bridge?.getAudioStudioCapabilities) return;
    let active = true;
    const unsubscribe = bridge.onAudioStudioProgress?.((job) => {
      if (!active) return;
      setJobs((current) => mergeJobs(current, [job]));
      if (job.status === "failed") setStatus(`${job.name}: ${job.error}`);
      if (job.status === "completed") setStatus(`${job.name} is ready`);
    });
    Promise.all([bridge.getAudioStudioCapabilities(), bridge.listAudioStudioJobs?.()])
      .then(([nextCapabilities, jobResult]) => {
        if (!active) return;
        setCapabilities(nextCapabilities);
        setOutputDirectory(nextCapabilities.defaultOutputDirectory);
        setConcurrency(nextCapabilities.defaultDownloadConcurrency);
        setFormatId(nextCapabilities.formats[0]?.id || "mp3");
        if (jobResult?.jobs) setJobs(jobResult.jobs);
      })
      .catch((error) => {
        if (active) setStatus(error instanceof Error ? error.message : "Audio Studio could not start");
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!pasteMenu) return;
    const closeMenu = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-audio-paste-menu]")) return;
      setPasteMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPasteMenu(null);
    };
    const closeOnBlur = () => setPasteMenu(null);
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("blur", closeOnBlur);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("blur", closeOnBlur);
    };
  }, [pasteMenu]);

  function addLinks(value: string) {
    const incoming = parseAudioLinks(value);
    if (!incoming.length) {
      setStatus("No valid HTTP or HTTPS links were found");
      return 0;
    }
    const next = mergeAudioLinks(urls, incoming);
    const added = next.length - urls.length;
    setUrls(next);
    setStatus(added > 0
      ? `${added} ${added === 1 ? "link" : "links"} added on separate lines`
      : "Those links are already in the list");
    return added;
  }

  function addDraftLink() {
    if (!draftLinks.length) {
      setStatus("Enter a complete HTTP or HTTPS link");
      return;
    }
    addLinks(urlDraft);
    setUrlDraft("");
  }

  function handleLinkPaste(event: ReactClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    const validDraft = parseAudioLinks(urlDraft);
    addLinks(validDraft.length ? `${urlDraft}\n${pastedText}` : pastedText);
    if (validDraft.length) setUrlDraft("");
  }

  async function pasteLinksFromClipboard() {
    setPasteMenu(null);
    try {
      const clipboardText = await navigator.clipboard.readText();
      const validDraft = parseAudioLinks(urlDraft);
      addLinks(validDraft.length ? `${urlDraft}\n${clipboardText}` : clipboardText);
      if (validDraft.length) setUrlDraft("");
    } catch {
      setStatus("Clipboard access is unavailable. Click the field and use Ctrl+V instead");
    }
  }

  function handleLinkKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addDraftLink();
  }

  function openPasteMenu(event: ReactMouseEvent<HTMLInputElement>) {
    event.preventDefault();
    setPasteMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 150)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 52)),
    });
  }

  async function chooseFiles() {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.chooseAudioStudioFiles) return;
    setBusy(true);
    try {
      const result = await bridge.chooseAudioStudioFiles();
      if (!result.canceled) {
        setSelectedFiles((current) => {
          const byPath = new Map(current.map((file) => [file.sourcePath, file]));
          result.files.forEach((file) => byPath.set(file.sourcePath, file));
          return Array.from(byPath.values());
        });
        setStatus(`${result.files.length} ${result.files.length === 1 ? "file" : "files"} added`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The files could not be selected");
    } finally {
      setBusy(false);
    }
  }

  async function chooseOutputDirectory() {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.chooseAudioStudioOutputDirectory) return;
    try {
      const result = await bridge.chooseAudioStudioOutputDirectory();
      if (!result.canceled) {
        setOutputDirectory(result.directory);
        setStatus("Output folder updated");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The folder could not be opened");
    }
  }

  async function startConversions() {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.startAudioStudioConversions || !selectedFiles.length || !outputDirectory) return;
    setBusy(true);
    try {
      const result = await bridge.startAudioStudioConversions({
        files: selectedFiles.map(({ sourcePath }) => ({ sourcePath })),
        outputDirectory,
        formatId,
        bitrateKbps,
        sampleRate,
        channels,
        normalize,
      });
      setJobs((current) => mergeJobs(current, result.jobs));
      setStatus(`${result.jobs.length} ${result.jobs.length === 1 ? "conversion" : "conversions"} added to the queue`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The conversion could not be started");
    } finally {
      setBusy(false);
    }
  }

  async function startDownloads() {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.startAudioStudioDownloads || !urls.length || !outputDirectory) return;
    setBusy(true);
    try {
      const result = await bridge.startAudioStudioDownloads({ urls, outputDirectory, concurrency, rightsAccepted });
      setJobs((current) => mergeJobs(current, result.jobs));
      setUrls([]);
      setUrlDraft("");
      setStatus(`${result.jobs.length} ${result.jobs.length === 1 ? "download" : "downloads"} added to the queue`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The downloads could not be started");
    } finally {
      setBusy(false);
    }
  }

  async function cancelJob(jobId: string) {
    try {
      const job = await getPixoresDesktopBridge()?.cancelAudioStudioJob?.(jobId);
      if (job) setJobs((current) => mergeJobs(current, [job]));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The job could not be cancelled");
    }
  }

  async function retryJob(jobId: string) {
    try {
      const result = await getPixoresDesktopBridge()?.retryAudioStudioJob?.(jobId);
      if (result?.job) setJobs((current) => mergeJobs(current, [result.job]));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The job could not be retried");
    }
  }

  async function revealOutput(filePath: string) {
    try {
      await getPixoresDesktopBridge()?.revealAudioStudioOutput?.(filePath);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The file could not be shown");
    }
  }

  function sendToVideoMaker(items: PixoresAudioStudioJob[]) {
    const payload: PixoresVideoStartAudioItem[] = items
      .filter((job) => job.status === "completed" && job.outputUrl)
      .map((job) => ({ name: job.name, outputPath: job.outputPath, outputUrl: job.outputUrl, mimeType: job.mimeType, size: job.size }));
    if (!payload.length) return;
    sessionStorage.setItem(PIXORES_VIDEO_START_AUDIO_KEY, JSON.stringify(payload));
    router.push("/video-maker?desktop=1");
  }

  function returnToStart() {
    router.push("/video-maker/start?desktop=1");
  }

  if (!desktopReady) {
    return <AudioStudioLanding />;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div className={styles.heroTitle}>
          <span className={styles.heroIcon}><AudioLines size={28} /></span>
          <div><p className={styles.eyebrow}>PIXORES VIDEO MAKER PRO</p><h1>Audio Studio</h1></div>
        </div>
        <p>Convert files and download authorized audio without uploading content to a server.</p>
        <div className={styles.heroAside}>
          <button type="button" className={styles.backButton} onClick={returnToStart} title="Close Audio Studio and return to the start screen">
            <ArrowLeft size={16} /> Back to start
          </button>
          <div className={styles.heroStats}>
            <span><ListMusic size={15} /> {jobs.length} jobs</span>
            <span><LoaderCircle size={15} /> {activeJobCount} active</span>
            <span><CheckCircle2 size={15} /> {completedJobs.length} ready</span>
          </div>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.controlPanel}>
          <div className={styles.tabs} role="tablist" aria-label="Audio Studio">
            <button type="button" role="tab" aria-selected={tab === "convert"} className={tab === "convert" ? styles.activeTab : ""} onClick={() => setTab("convert")}><RefreshCw size={17} /> Convert</button>
            <button type="button" role="tab" aria-selected={tab === "download"} className={tab === "download" ? styles.activeTab : ""} onClick={() => setTab("download")}><Download size={17} /> Download by link</button>
          </div>

          {tab === "convert" ? (
            <div className={styles.panelBody}>
              <div className={styles.sectionHeading}><div><span>LOCAL FILES</span><h2>Batch conversion</h2></div><button type="button" className={styles.secondaryButton} onClick={chooseFiles} disabled={busy}><Upload size={17} /> Select audio</button></div>
              {selectedFiles.length ? (
                <div className={styles.fileList}>
                  {selectedFiles.map((file) => <div key={file.sourcePath} className={styles.fileRow}><FileAudio size={18} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></div><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelectedFiles((current) => current.filter((item) => item.sourcePath !== file.sourcePath))}><X size={16} /></button></div>)}
                </div>
              ) : <button type="button" className={styles.dropZone} onClick={chooseFiles}><Upload size={26} /><strong>Select one or more audio files</strong><span>MP3, WAV, M4A, FLAC, OGG, Opus, AIFF, and other files FFmpeg can read.</span></button>}

              <div className={styles.settingsGrid}>
                <label><span>Output format</span><select value={formatId} onChange={(event) => setFormatId(event.target.value)}>{capabilities?.formats.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}</select></label>
                <label><span>Bitrate</span><select value={bitrateKbps} onChange={(event) => setBitrateKbps(Number(event.target.value))}>{[64, 96, 128, 192, 256, 320].map((value) => <option key={value} value={value}>{value} kbps</option>)}</select></label>
                <label><span>Sample rate</span><select value={sampleRate} onChange={(event) => setSampleRate(Number(event.target.value))}><option value={44100}>44.1 kHz</option><option value={48000}>48 kHz</option></select></label>
                <label><span>Channels</span><select value={channels} onChange={(event) => setChannels(Number(event.target.value) === 1 ? 1 : 2)}><option value={2}>Stereo</option><option value={1}>Mono</option></select></label>
              </div>
              <label className={styles.checkRow}><input type="checkbox" checked={normalize} onChange={(event) => setNormalize(event.target.checked)} /><span><strong>Normalize volume</strong><small>Balances perceived loudness to −16 LUFS.</small></span></label>
              <button type="button" className={styles.primaryButton} onClick={startConversions} disabled={busy || !selectedFiles.length || !capabilities?.formats.length}>{busy ? <LoaderCircle className={styles.spin} size={18} /> : <SlidersHorizontal size={18} />} Convert {selectedFiles.length || "files"}</button>
            </div>
          ) : (
            <div className={styles.panelBody}>
              <div className={styles.sectionHeading}><div><span>AUDIO LINKS</span><h2>Concurrent downloads</h2></div><Download size={22} /></div>
              <div className={styles.urlField}>
                <span>Paste or enter an audio link</span>
                <div className={styles.urlComposer}>
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(event) => setUrlDraft(event.target.value)}
                    onPaste={handleLinkPaste}
                    onKeyDown={handleLinkKeyDown}
                    onContextMenu={openPasteMenu}
                    placeholder="https://www.myinstants.com/en/instant/.../"
                    aria-label="Audio link"
                  />
                  <button type="button" onClick={() => void pasteLinksFromClipboard()}><ClipboardPaste size={16} /> Paste</button>
                  <button type="button" onClick={addDraftLink} disabled={!draftLinks.length}><Plus size={16} /> Add</button>
                </div>
                <small>Every pasted link is added as a separate row. You can paste several links at once.</small>
              </div>
              {urls.length > 0 ? (
                <div className={styles.urlList}>
                  <header><strong>{urls.length} {urls.length === 1 ? "link" : "links"} ready</strong><button type="button" onClick={() => setUrls([])}><Trash2 size={13} /> Clear all</button></header>
                  {urls.map((url, index) => (
                    <div key={url} className={styles.urlRow}>
                      <span>{index + 1}</span>
                      <strong title={url}>{url}</strong>
                      <button type="button" aria-label={`Remove link ${index + 1}`} title="Remove link" onClick={() => setUrls((current) => current.filter((item) => item !== url))}><X size={15} /></button>
                    </div>
                  ))}
                </div>
              ) : <div className={styles.emptyUrlList}>Paste a link to create the first download row.</div>}
              <label className={styles.rangeField}><span><strong>Concurrent downloads</strong><small>{concurrency} of 5</small></span><input type="range" min={1} max={5} value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))} /></label>
              <label className={styles.rightsNotice}><input type="checkbox" checked={rightsAccepted} onChange={(event) => setRightsAccepted(event.target.checked)} /><ShieldCheck size={20} /><span><strong>I confirm I have permission to use these files</strong><small>Only download content you own, are authorized to use, or that has a compatible license.</small></span></label>
              <button type="button" className={styles.primaryButton} onClick={startDownloads} disabled={busy || !urls.length || !rightsAccepted}>{busy ? <LoaderCircle className={styles.spin} size={18} /> : <Download size={18} />} Download {urls.length || "audio files"}</button>
            </div>
          )}

          <div className={styles.outputBar}><FolderOpen size={18} /><div><span>Output folder</span><strong title={outputDirectory}>{outputDirectory || "Loading…"}</strong></div><button type="button" onClick={chooseOutputDirectory}>Change</button></div>
        </section>

        <aside className={styles.queuePanel}>
          <div className={styles.queueHeader}><div><span>JOB QUEUE</span><h2>Activity</h2></div>{completedJobs.length > 0 && <button type="button" onClick={() => sendToVideoMaker(completedJobs)}><Send size={15} /> Send all</button>}</div>
          <div className={styles.statusBar} role="status"><Gauge size={15} /><span>{status}</span></div>
          <div className={styles.jobList}>
            {jobs.length ? jobs.map((job) => (
              <article key={job.id} className={styles.jobCard} data-status={job.status}>
                <div className={styles.jobTop}><span className={styles.jobType}>{job.type === "download" ? <Download size={16} /> : <RefreshCw size={16} />}</span><div><strong>{job.name}</strong><small title={job.sourceLabel}>{job.sourceLabel}</small></div><span className={styles.jobState}>{job.status}</span></div>
                <div className={styles.progressTrack}><span style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }} /></div>
                <div className={styles.jobMeta}><span>{job.message}</span><span>{job.progress}%{job.size ? ` · ${formatBytes(job.size)}` : ""}</span></div>
                {job.error && <p className={styles.jobError}>{job.error}</p>}
                {job.status === "completed" && job.outputUrl && <audio className={styles.audioPreview} controls preload="metadata" src={job.outputUrl} />}
                <div className={styles.jobActions}>
                  {activeStatuses.has(job.status) && <button type="button" onClick={() => cancelJob(job.id)}><Square size={13} /> Cancel</button>}
                  {(job.status === "failed" || job.status === "cancelled") && <button type="button" onClick={() => retryJob(job.id)}><RefreshCw size={13} /> Retry</button>}
                  {job.status === "completed" && <><button type="button" onClick={() => revealOutput(job.outputPath)}><FolderOpen size={13} /> Show</button><button type="button" className={styles.sendButton} onClick={() => sendToVideoMaker([job])}><Send size={13} /> Video Maker</button></>}
                </div>
              </article>
            )) : <div className={styles.emptyQueue}><ListMusic size={30} /><strong>The queue is empty</strong><span>Conversions and downloads will appear here.</span></div>}
          </div>
          {jobs.length > 0 && <button type="button" className={styles.clearButton} onClick={() => setJobs((current) => current.filter((job) => activeStatuses.has(job.status)))}><Trash2 size={14} /> Hide finished jobs</button>}
        </aside>
      </div>
      {pasteMenu && (
        <div data-audio-paste-menu className={styles.pasteContextMenu} style={{ left: pasteMenu.x, top: pasteMenu.y }} onContextMenu={(event) => event.preventDefault()}>
          <button type="button" onClick={() => void pasteLinksFromClipboard()}><ClipboardPaste size={15} /> Paste</button>
        </div>
      )}
    </div>
  );
}
