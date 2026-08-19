"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import DesktopAuthGate from "@/components/DesktopAuthGate";
import { ArrowRight, AudioLines, Clock3, Copy, DownloadCloud, FileVideo, FolderOpen, ImagePlus, KeyRound, LogOut, Monitor, MonitorCog, Pencil, Plus, RefreshCw, RotateCcw, Scissors, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Type, UserCircle, X } from "lucide-react";
import type { PixoresVideoFormat } from "@/src/video-render/types";
import { getPixoresDesktopBridge, isPixoresDesktop } from "@/src/video-maker/adapters/runtime";
import type { PixoresLicenseStatus, PixoresUpdateStatus, ProjectPackageRecentProject } from "@/src/video-maker/adapters/types";
import {
  PIXORES_VIDEO_START_FORMAT_KEY,
  PIXORES_VIDEO_START_PROJECT_KEY,
  PIXORES_VIDEO_START_TOOL_KEY,
  type PixoresVideoStartTool,
  type PixoresVideoStartFormatPayload,
  type PixoresVideoStartProjectPayload,
} from "@/src/video-maker/startup";
import styles from "./VideoMakerStart.module.css";

const RECENTS_STORAGE_KEY = "pixores-video-maker-recent-projects";
const LICENSE_STORAGE_KEY = "pixores-video-maker-license";
const PIXORES_WEBSITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pixores.com").replace(/\/$/, "");

const quickFormats: PixoresVideoFormat[] = [
  { id: "16_9", label: "YouTube 16:9", width: 1920, height: 1080 },
  { id: "9_16", label: "TikTok 9:16", width: 1080, height: 1920 },
  { id: "1_1", label: "Instagram 1:1", width: 1080, height: 1080 },
  { id: "4_5", label: "Instagram 4:5", width: 1080, height: 1350 },
  { id: "custom", label: "Custom", width: 1920, height: 1080 },
];

const formatPreviewImages: Record<string, string> = {
  "16_9": "/template-assets/backgrounds/creator-breaking-world.webp",
  "9_16": "/template-assets/backgrounds/creator-ai-experiment.webp",
  "1_1": "/template-assets/backgrounds/gaming-square.webp",
  "4_5": "/template-assets/backgrounds/creator-business-growth.webp",
  custom: "/template-assets/backgrounds/creator-top-tools.webp",
};

const toolPreviewImages = {
  smartClips: "/template-assets/backgrounds/creator-ai-tools.webp",
  videoEditor: "/template-assets/backgrounds/creator-breaking-world.webp",
  socialResizer: "/template-assets/backgrounds/creator-business-growth.webp",
  backgroundRemover: "/template-assets/backgrounds/mood-joyful.webp",
  thumbnailMaker: "/template-assets/backgrounds/creator-thumbnail-design.webp",
  autoCaptions: "/template-assets/backgrounds/creator-truth-exposed.webp",
  audioStudio: "/template-assets/backgrounds/mood-calm.webp",
};

function getRecentProjectPreview(project: ProjectPackageRecentProject) {
  if (project.width && project.height && project.height > project.width) return formatPreviewImages["9_16"];
  if (project.width && project.height && Math.abs(project.width - project.height) < 8) return formatPreviewImages["1_1"];
  return formatPreviewImages["16_9"];
}

function editorUrl() {
  return isPixoresDesktop() ? "/video-maker?desktop=1" : "/video-maker";
}

function saveRecentsToStorage(projects: ProjectPackageRecentProject[]) {
  localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(projects.slice(0, 12)));
}

function readRecentsFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENTS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 12) as ProjectPackageRecentProject[] : [];
  } catch {
    return [];
  }
}

function rememberRecent(project: ProjectPackageRecentProject) {
  const existing = readRecentsFromStorage();
  const next = [project, ...existing.filter((item) => item.filePath !== project.filePath)].slice(0, 12);
  saveRecentsToStorage(next);
  return next;
}

function removeRecentFromStorage(filePath: string) {
  const next = readRecentsFromStorage().filter((item) => item.filePath !== filePath);
  saveRecentsToStorage(next);
  return next;
}

function renameRecentInStorage(filePath: string, title: string) {
  const next = readRecentsFromStorage().map((project) => (
    project.filePath === filePath
      ? { ...project, title, updatedAt: new Date().toISOString() }
      : project
  ));
  saveRecentsToStorage(next);
  return next;
}

function getProjectAspectLabel(project: ProjectPackageRecentProject) {
  if (project.formatLabel?.match(/\d+\s*:\s*\d+/)) return project.formatLabel.match(/\d+\s*:\s*\d+/)?.[0].replace(/\s/g, "") || project.formatLabel;
  if (!project.width || !project.height) return project.formatLabel || "Project";

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(project.width), Math.round(project.height)) || 1;
  return `${Math.round(project.width / divisor)}:${Math.round(project.height / divisor)}`;
}

function formatProjectUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function createFallbackLicenseStatus(): PixoresLicenseStatus {
  return {
    ok: true,
    plan: "not_signed_in",
    label: "Not signed in",
    source: "none",
  };
}

function createFallbackUpdateStatus(): PixoresUpdateStatus {
  return {
    ok: true,
    status: "idle",
    message: "Updates are manual.",
  };
}

function getLicenseStatusFromKey(licenseKey: string, accountEmail?: string): PixoresLicenseStatus {
  const normalizedKey = licenseKey.trim().toUpperCase();
  const now = new Date().toISOString();

  if (normalizedKey.startsWith("PIXORES-LIFETIME-")) {
    return {
      ok: true,
      plan: "lifetime",
      label: "Lifetime",
      source: "local",
      licenseKey: normalizedKey,
      accountEmail: accountEmail?.trim() || undefined,
      updatedAt: now,
      provider: "manual",
    };
  }

  if (normalizedKey.startsWith("PIXORES-PRO-")) {
    return {
      ok: true,
      plan: "pro",
      label: "Pro",
      source: "local",
      licenseKey: normalizedKey,
      accountEmail: accountEmail?.trim() || undefined,
      updatedAt: now,
      provider: "manual",
    };
  }

  return {
    ok: true,
    plan: "free",
    label: "Free",
    source: "local",
    licenseKey: normalizedKey,
    accountEmail: accountEmail?.trim() || undefined,
    updatedAt: now,
    provider: "manual",
  };
}

function readLicenseFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LICENSE_STORAGE_KEY) || "null") as PixoresLicenseStatus | null;
    return parsed?.ok ? parsed : createFallbackLicenseStatus();
  } catch {
    return createFallbackLicenseStatus();
  }
}

function saveLicenseToStorage(status: PixoresLicenseStatus) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(status));
}

function clearLicenseFromStorage() {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

export default function VideoMakerStartPage() {
  const [selectedFormatId, setSelectedFormatId] = useState("16_9");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [recentProjects, setRecentProjects] = useState<ProjectPackageRecentProject[]>([]);
  const [status, setStatus] = useState("Ready to create");
  const [isOpening, setIsOpening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProjectPath, setEditingProjectPath] = useState("");
  const [editingProjectTitle, setEditingProjectTitle] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<PixoresLicenseStatus>(createFallbackLicenseStatus);
  const [licenseKey, setLicenseKey] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [isSavingLicense, setIsSavingLicense] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<PixoresUpdateStatus>(createFallbackUpdateStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const desktopMode = isPixoresDesktop();

  const selectedFormat = useMemo(() => {
    const format = quickFormats.find((item) => item.id === selectedFormatId) || quickFormats[0];
    return format.id === "custom" ? { ...format, width: customWidth, height: customHeight } : format;
  }, [customHeight, customWidth, selectedFormatId]);

  useEffect(() => {
    let active = true;
    const bridge = getPixoresDesktopBridge();
    queueMicrotask(() => {
      if (!active) return;
      setRecentProjects(readRecentsFromStorage());
      setLicenseStatus(readLicenseFromStorage());
    });

    if (!bridge?.getRecentProjects) return () => { active = false; };
    bridge.getRecentProjects()
      .then((result) => {
        if (!active) return;
        setRecentProjects(result.projects);
        saveRecentsToStorage(result.projects);
      })
      .catch(() => {
        if (!active) return;
        setStatus("Recent projects are available after opening a desktop project.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.getLicenseStatus) return;

    bridge.getLicenseStatus()
      .then((result) => {
        setLicenseStatus(result);
        if (result.licenseKey) setLicenseKey(result.licenseKey);
        if (result.accountEmail) setAccountEmail(result.accountEmail);
        saveLicenseToStorage(result);
      })
      .catch(() => {
        setStatus("License status is local-only until desktop account services are available.");
      });
  }, []);

  function goToEditor() {
    window.location.assign(editorUrl());
  }

  function openAudioStudio() {
    window.location.assign(isPixoresDesktop() ? "/audio-studio?desktop=1" : "/audio-studio");
  }

  function startNewProject() {
    const payload: PixoresVideoStartFormatPayload = {
      title: "Untitled video",
      format: selectedFormat,
    };
    sessionStorage.setItem(PIXORES_VIDEO_START_FORMAT_KEY, JSON.stringify(payload));
    goToEditor();
  }

  function launchEditorTool(tool: PixoresVideoStartTool) {
    sessionStorage.setItem(PIXORES_VIDEO_START_TOOL_KEY, tool);
    if (tool === "smart-clips" || tool === "social-resizer") {
      const verticalFormat = quickFormats.find((format) => format.id === "9_16") || quickFormats[1];
      const payload: PixoresVideoStartFormatPayload = {
        title: tool === "smart-clips" ? "Smart Clips project" : "Social video project",
        format: verticalFormat,
      };
      sessionStorage.setItem(PIXORES_VIDEO_START_FORMAT_KEY, JSON.stringify(payload));
    }
    goToEditor();
  }

  async function openWebsiteTool(pathname: string) {
    const url = `${PIXORES_WEBSITE_URL}${pathname}`;
    const bridge = getPixoresDesktopBridge();
    if (bridge?.openExternalUrl) {
      await bridge.openExternalUrl(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function openProjectFromDialog() {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.openProjectPackage) {
      setStatus("Open .pixores-video is available in the desktop app.");
      return;
    }

    setIsOpening(true);
    setStatus("Opening project...");
    try {
      const result = await bridge.openProjectPackage();
      if (result.canceled) {
        setStatus("Open canceled");
        return;
      }

      const payload: PixoresVideoStartProjectPayload = {
        project: result.project,
        title: result.metadata.title,
        filePath: result.filePath,
      };
      sessionStorage.setItem(PIXORES_VIDEO_START_PROJECT_KEY, JSON.stringify(payload));

      const recent = {
        filePath: result.filePath,
        title: result.metadata.title,
        updatedAt: result.metadata.updatedAt,
        formatLabel: result.project.format?.label,
        width: result.project.canvas?.width,
        height: result.project.canvas?.height,
      };
      const recentsResult = await (bridge.addRecentProject || bridge.saveRecentProject)?.(recent);
      if (recentsResult?.projects) {
        setRecentProjects(recentsResult.projects);
        saveRecentsToStorage(recentsResult.projects);
      } else {
        setRecentProjects(rememberRecent(recent));
      }
      goToEditor();
    } catch (error) {
      setStatus(`Open error: ${error instanceof Error ? error.message : "Project could not be opened"}`);
    } finally {
      setIsOpening(false);
    }
  }

  async function openRecentProject(project: ProjectPackageRecentProject) {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.openRecentProjectPackage) {
      setStatus("Recent projects open in the desktop app.");
      return;
    }

    setIsOpening(true);
    setStatus(`Opening ${project.title}...`);
    try {
      const result = await bridge.openRecentProjectPackage(project.filePath);
      if (result.canceled) {
        setStatus("Open canceled");
        return;
      }

      const payload: PixoresVideoStartProjectPayload = {
        project: result.project,
        title: result.metadata.title,
        filePath: result.filePath,
      };
      sessionStorage.setItem(PIXORES_VIDEO_START_PROJECT_KEY, JSON.stringify(payload));
      const recent = {
        filePath: result.filePath,
        title: result.metadata.title,
        updatedAt: result.metadata.updatedAt,
        formatLabel: result.project.format?.label,
        width: result.project.canvas?.width,
        height: result.project.canvas?.height,
      };
      const recentsResult = await (bridge.addRecentProject || bridge.saveRecentProject)?.(recent);
      if (recentsResult?.projects) {
        setRecentProjects(recentsResult.projects);
        saveRecentsToStorage(recentsResult.projects);
      } else {
        setRecentProjects(rememberRecent(recent));
      }
      goToEditor();
    } catch (error) {
      setStatus(`Recent project error: ${error instanceof Error ? error.message : "Project could not be opened"}`);
    } finally {
      setIsOpening(false);
    }
  }

  async function removeRecentProject(project: ProjectPackageRecentProject) {
    const bridge = getPixoresDesktopBridge();
    setStatus(`Removing ${project.title} from recent projects...`);

    try {
      const result = await bridge?.removeRecentProject?.(project.filePath);
      const projects = result?.projects || removeRecentFromStorage(project.filePath);
      setRecentProjects(projects);
      saveRecentsToStorage(projects);
      if (editingProjectPath === project.filePath) {
        setEditingProjectPath("");
        setEditingProjectTitle("");
      }
      setStatus("Project removed from recents");
    } catch (error) {
      setStatus(`Remove error: ${error instanceof Error ? error.message : "Project could not be removed"}`);
    }
  }

  function beginRenameProject(project: ProjectPackageRecentProject) {
    setEditingProjectPath(project.filePath);
    setEditingProjectTitle(project.title);
  }

  async function commitRenameProject(project: ProjectPackageRecentProject) {
    const title = editingProjectTitle.trim();
    if (!title) {
      setStatus("Project name is required");
      return;
    }

    const bridge = getPixoresDesktopBridge();
    setStatus(`Renaming ${project.title}...`);

    try {
      const result = await bridge?.renameRecentProject?.({ filePath: project.filePath, title });
      const projects = result?.projects || renameRecentInStorage(project.filePath, title);
      setRecentProjects(projects);
      saveRecentsToStorage(projects);
      setEditingProjectPath("");
      setEditingProjectTitle("");
      setStatus("Project renamed");
    } catch (error) {
      setStatus(`Rename error: ${error instanceof Error ? error.message : "Project could not be renamed"}`);
    }
  }

  async function duplicateRecentProject(project: ProjectPackageRecentProject) {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.duplicateRecentProject) {
      setStatus("Duplicate is available in the desktop app.");
      return;
    }

    setStatus(`Duplicating ${project.title}...`);
    try {
      const result = await bridge.duplicateRecentProject(project.filePath);
      setRecentProjects(result.projects);
      saveRecentsToStorage(result.projects);
      setStatus("Project duplicated");
    } catch (error) {
      setStatus(`Duplicate error: ${error instanceof Error ? error.message : "Project could not be duplicated"}`);
    }
  }

  async function saveManualLicense() {
    const cleanKey = licenseKey.trim();
    if (!cleanKey) {
      setStatus("Paste a license key first");
      return;
    }

    const bridge = getPixoresDesktopBridge();
    setIsSavingLicense(true);
    setStatus("Saving license...");

    try {
      const result = await bridge?.saveLicenseStatus?.({ licenseKey: cleanKey, accountEmail });
      const nextStatus = result || getLicenseStatusFromKey(cleanKey, accountEmail);
      setLicenseStatus(nextStatus);
      saveLicenseToStorage(nextStatus);
      setStatus(`Account status: ${nextStatus.label}`);
    } catch (error) {
      setStatus(`License error: ${error instanceof Error ? error.message : "License could not be saved"}`);
    } finally {
      setIsSavingLicense(false);
    }
  }

  async function clearManualLicense() {
    const bridge = getPixoresDesktopBridge();
    setIsSavingLicense(true);
    setStatus("Clearing license...");

    try {
      const result = await bridge?.clearLicenseStatus?.();
      const nextStatus = result || createFallbackLicenseStatus();
      clearLicenseFromStorage();
      setLicenseStatus(nextStatus);
      setLicenseKey("");
      setAccountEmail("");
      setStatus("Account status cleared");
    } catch (error) {
      setStatus(`License clear error: ${error instanceof Error ? error.message : "License could not be cleared"}`);
    } finally {
      setIsSavingLicense(false);
    }
  }

  async function runUpdateAction(action: "check" | "download" | "install") {
    const bridge = getPixoresDesktopBridge();
    const updateAction = action === "check"
      ? bridge?.checkForUpdates
      : action === "download"
        ? bridge?.downloadUpdate
        : bridge?.installUpdate;
    const actionLabels = {
      check: "Checking for updates...",
      download: "Downloading update...",
      install: "Restarting to install update...",
    };

    if (!updateAction) {
      const unavailable = {
        ok: true,
        status: "unavailable" as const,
        message: "Auto-update is available in the desktop app.",
      };
      setUpdateStatus(unavailable);
      setStatus(unavailable.message);
      return;
    }

    setIsUpdating(true);
    setStatus(actionLabels[action]);

    try {
      const result = await updateAction();
      const nextStatus = result || createFallbackUpdateStatus();
      setUpdateStatus(nextStatus);
      setStatus(nextStatus.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update action failed.";
      setUpdateStatus({
        ok: false,
        status: "error",
        message,
      });
      setStatus(message);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <DesktopAuthGate>
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <div className={styles.brandMark}>
            <Image className={styles.brandLogo} src="/pixores-logo.png" alt="Pixores" width={445} height={120} priority />
            <span className={styles.productName}>Pixores Video Maker Pro</span>
          </div>
          <h1>Create without limits.</h1>
          <p>Professional video editing, social clips, motion graphics, and Pixores creative tools in one focused desktop studio.</p>
        </div>
        <button className={styles.settingsButton} type="button" onClick={() => setShowSettings((current) => !current)}>
          <Settings size={18} />
          Settings
        </button>
      </section>

      <section className={styles.grid}>
        <div className={styles.primaryPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span>New project</span>
              <h2>Choose a format</h2>
            </div>
            <MonitorCog size={22} />
          </div>

          <div className={styles.formatGrid}>
            {quickFormats.map((format) => (
              <button
                key={format.id}
                className={`${styles.formatButton} ${selectedFormatId === format.id ? styles.selectedFormat : ""}`}
                type="button"
                onClick={() => setSelectedFormatId(format.id)}
              >
                <span className={styles.formatPreview}>
                  <Image
                    className={styles.formatPreviewImage}
                    src={formatPreviewImages[format.id] || formatPreviewImages.custom}
                    alt=""
                    fill
                    sizes="(max-width: 620px) 100vw, 180px"
                  />
                  <span className={styles.formatPreviewShade} />
                  <span className={styles.formatSafeFrame} style={{ aspectRatio: `${format.width} / ${format.height}` }} />
                </span>
                <strong>{format.label}</strong>
                <small>{format.id === "custom" ? `${customWidth} x ${customHeight}` : `${format.width} x ${format.height}`}</small>
              </button>
            ))}
          </div>

          {selectedFormatId === "custom" && (
            <div className={styles.customInputs}>
              <label>
                Width
                <input type="number" min={320} max={7680} value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value) || 1920)} />
              </label>
              <label>
                Height
                <input type="number" min={320} max={7680} value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value) || 1080)} />
              </label>
            </div>
          )}

          <div className={styles.actionRow}>
            <button className={styles.primaryAction} type="button" onClick={startNewProject}>
              <Plus size={20} />
              New project
            </button>
            <button className={styles.secondaryAction} type="button" onClick={openProjectFromDialog} disabled={isOpening}>
              <FolderOpen size={20} />
              Open .pixores-video
            </button>
            <button className={styles.editorAction} type="button" onClick={goToEditor}>
              Enter editor
              <ArrowRight size={18} />
            </button>
          </div>

          <section className={styles.toolsSection} aria-label="Pixores creative tools">
            <div className={styles.panelHeader}>
              <div>
                <span>Creative launchpad</span>
                <h2>What do you want to make?</h2>
              </div>
              <Sparkles size={22} />
            </div>
            <div className={styles.toolGrid}>
              <button type="button" className={`${styles.toolCard} ${styles.featuredTool}`} onClick={() => launchEditorTool("smart-clips")}>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.smartClips} alt="" fill sizes="360px" /><span className={styles.toolIcon}><Scissors size={23} /></span></span>
                <strong>Smart Clips</strong>
                <small>Create Reels, Shorts, and TikToks automatically.</small>
                <em>New</em>
              </button>
              <button type="button" className={styles.toolCard} onClick={() => launchEditorTool("video-editor")}>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.videoEditor} alt="" fill sizes="360px" /><span className={styles.toolIcon}><FileVideo size={23} /></span></span>
                <strong>Video Editor</strong>
                <small>Timeline editing, effects, titles, and local export.</small>
              </button>
              <button type="button" className={styles.toolCard} onClick={() => launchEditorTool("social-resizer")}>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.socialResizer} alt="" fill sizes="360px" /><span className={styles.toolIcon}><Monitor size={23} /></span></span>
                <strong>Social Resizer</strong>
                <small>Adapt a project to vertical and social formats.</small>
              </button>
              <button type="button" className={styles.toolCard} onClick={() => void openWebsiteTool("/remove-background")}>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.backgroundRemover} alt="" fill sizes="360px" /><span className={styles.toolIcon}><ImagePlus size={23} /></span></span>
                <strong>Background Remover</strong>
                <small>Remove image backgrounds with Pixores AI.</small>
              </button>
              <button type="button" className={styles.toolCard} onClick={() => void openWebsiteTool("/youtube-thumbnail-maker")}>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.thumbnailMaker} alt="" fill sizes="360px" /><span className={styles.toolIcon}><Type size={23} /></span></span>
                <strong>Thumbnail Maker</strong>
                <small>Create branded thumbnails and social graphics.</small>
              </button>
              <button type="button" className={styles.toolCard} onClick={openAudioStudio}>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.audioStudio} alt="" fill sizes="360px" /><span className={styles.toolIcon}><AudioLines size={23} /></span></span>
                <strong>Audio Studio</strong>
                <small>Convert audio formats and download authorized links.</small>
                <em>New</em>
              </button>
              <button type="button" className={styles.toolCard} disabled>
                <span className={styles.toolThumbnail}><Image src={toolPreviewImages.autoCaptions} alt="" fill sizes="360px" /><span className={styles.toolIcon}><Sparkles size={23} /></span></span>
                <strong>Auto Captions</strong>
                <small>Automatic captions and animated subtitles.</small>
                <em>Coming soon</em>
              </button>
            </div>
          </section>

          {showSettings && (<>
          <section className={styles.accountPanel} aria-label="Account and license">
            <div className={styles.panelHeader}>
              <div>
                <span>Account</span>
                <h2>License status</h2>
              </div>
              <UserCircle size={22} />
            </div>

            <div className={styles.licenseSummary}>
              {(["not_signed_in", "free", "pro", "lifetime"] as const).map((plan) => (
                <span key={plan} className={licenseStatus.plan === plan ? styles.activeLicensePill : ""}>
                  {plan === "not_signed_in" ? "Not signed in" : plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Lifetime"}
                </span>
              ))}
            </div>

            <div className={styles.accountStatusCard}>
              <ShieldCheck size={20} />
              <div>
                <strong>{licenseStatus.label}</strong>
                <small>
                  {licenseStatus.updatedAt ? `Updated ${formatProjectUpdatedAt(licenseStatus.updatedAt)}` : "Local access remains enabled"}
                </small>
              </div>
            </div>

            <div className={styles.licenseGrid}>
              <label>
                Email
                <input
                  type="email"
                  value={accountEmail}
                  placeholder="you@example.com"
                  onChange={(event) => setAccountEmail(event.target.value)}
                />
              </label>
              <label>
                License key
                <input
                  value={licenseKey}
                  placeholder="PIXORES-PRO-..."
                  onChange={(event) => setLicenseKey(event.target.value)}
                />
              </label>
            </div>

            <div className={styles.accountActions}>
              <button type="button" className={styles.secondaryAction} onClick={saveManualLicense} disabled={isSavingLicense}>
                <KeyRound size={18} />
                Save license
              </button>
              <button type="button" className={styles.editorAction} onClick={clearManualLicense} disabled={isSavingLicense}>
                <LogOut size={18} />
                Clear
              </button>
            </div>
          </section>

          <section className={styles.updatePanel} aria-label="Desktop updates">
            <div className={styles.panelHeader}>
              <div>
                <span>Updates</span>
                <h2>Desktop auto-update</h2>
              </div>
              <RefreshCw size={22} />
            </div>

            <div className={styles.updateStatusCard}>
              <DownloadCloud size={20} />
              <div>
                <strong>{updateStatus.version ? `Version ${updateStatus.version}` : updateStatus.currentVersion ? `Current ${updateStatus.currentVersion}` : "Manual updates"}</strong>
                <small>{updateStatus.message}</small>
              </div>
            </div>

            <div className={styles.accountActions}>
              <button type="button" className={styles.secondaryAction} onClick={() => void runUpdateAction("check")} disabled={isUpdating}>
                <RefreshCw size={18} />
                Check for updates
              </button>
              <button type="button" className={styles.secondaryAction} onClick={() => void runUpdateAction("download")} disabled={isUpdating}>
                <DownloadCloud size={18} />
                Download update
              </button>
              <button type="button" className={styles.editorAction} onClick={() => void runUpdateAction("install")} disabled={isUpdating}>
                <RotateCcw size={18} />
                Restart to install
              </button>
            </div>
          </section>
          </>)}
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Projects</span>
              <h2>Recent</h2>
            </div>
            <Clock3 size={22} />
          </div>

          <div className={styles.recentList}>
            {recentProjects.length > 0 ? recentProjects.map((project) => (
              <article key={project.filePath} className={styles.recentItem}>
                <span className={styles.recentIcon}>
                  <Image src={getRecentProjectPreview(project)} alt="" fill sizes="72px" />
                  <FileVideo size={18} />
                </span>
                <div className={styles.recentInfo}>
                  {editingProjectPath === project.filePath ? (
                    <label className={styles.renameField}>
                      <span>Project name</span>
                      <input
                        value={editingProjectTitle}
                        onChange={(event) => setEditingProjectTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void commitRenameProject(project);
                          if (event.key === "Escape") {
                            setEditingProjectPath("");
                            setEditingProjectTitle("");
                          }
                        }}
                        autoFocus
                      />
                    </label>
                  ) : (
                    <>
                      <strong>{project.title}</strong>
                      <small>{formatProjectUpdatedAt(project.updatedAt)}</small>
                    </>
                  )}
                  <div className={styles.recentMeta}>
                    <span>{getProjectAspectLabel(project)}</span>
                    {project.width && project.height ? <span>{project.width} x {project.height}</span> : null}
                  </div>
                  <span className={styles.recentPath}>{project.filePath}</span>
                </div>
                <div className={styles.recentActions}>
                  {editingProjectPath === project.filePath ? (
                    <>
                      <button type="button" className={styles.iconAction} aria-label="Save project name" onClick={() => void commitRenameProject(project)}>
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconAction}
                        aria-label="Cancel rename"
                        onClick={() => {
                          setEditingProjectPath("");
                          setEditingProjectTitle("");
                        }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={styles.openAction} onClick={() => openRecentProject(project)} disabled={isOpening}>
                        Open
                      </button>
                      <button type="button" className={styles.iconAction} aria-label="Rename project" onClick={() => beginRenameProject(project)}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className={styles.iconAction} aria-label="Duplicate project" onClick={() => void duplicateRecentProject(project)} disabled={isOpening}>
                        <Copy size={16} />
                      </button>
                      <button type="button" className={styles.iconAction} aria-label="Remove from recents" onClick={() => void removeRecentProject(project)} disabled={isOpening}>
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            )) : (
              <div className={styles.emptyRecent}>
                <FolderOpen size={24} />
                <span>No recent projects yet</span>
              </div>
            )}
          </div>

          {showSettings && (
            <div className={styles.settingsPanel}>
              <div>
                <SlidersHorizontal size={18} />
                <strong>Desktop runtime</strong>
              </div>
              <p>{desktopMode ? "Electron bridge ready. Local render and project packages are available." : "Open the desktop app to enable local project packages and local render."}</p>
            </div>
          )}
        </aside>
      </section>

      <div className={styles.statusBar}>{status}</div>
    </div>
    </DesktopAuthGate>
  );
}
