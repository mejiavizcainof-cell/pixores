import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Download, Film, Gauge, MonitorDown, ShieldCheck, Sparkles, Upload } from "lucide-react";
import styles from "./DesktopPage.module.css";

export const metadata: Metadata = {
  title: "Download Pixores Video Maker for Windows",
  description:
    "Download Pixores Video Maker Desktop 0.1.3-beta.51 for Windows. Edit locally, render with GPU acceleration, create Smart Clips, captions and publish to YouTube.",
  alternates: { canonical: "https://www.pixores.com/desktop" },
  openGraph: {
    title: "Pixores Video Maker Desktop",
    description: "Professional local video editing for Windows with GPU rendering and direct YouTube publishing.",
    url: "https://www.pixores.com/desktop",
    siteName: "Pixores",
    type: "website",
  },
};

const version = "0.1.3-beta.51";
const installerName = `Pixores.Desktop.Setup.${version}.exe`;
const defaultDesktopDownloadUrl =
  `https://github.com/mejiavizcainof-cell/pixores/releases/download/pixores-video-maker-v${version}/${encodeURIComponent(installerName)}`;
const desktopDownloadUrl = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || defaultDesktopDownloadUrl;

const features = [
  { icon: Gauge, title: "Hybrid GPU rendering", copy: "Uses NVIDIA acceleration when available and preserves the full compositor for complex layers." },
  { icon: Sparkles, title: "Smart creative tools", copy: "Generate captions, remove silences, build Smart Clips and create automatic thumbnails." },
  { icon: Upload, title: "Publish to YouTube", copy: "Upload large videos with resumable transfers, metadata, privacy controls and custom thumbnails." },
  { icon: ShieldCheck, title: "Local-first workflow", copy: "Projects, imported media and renders remain on your computer while you edit." },
];

export default function DesktopPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Image className={styles.wordmark} src="/pixores-logo-dark.png" alt="Pixores" width={445} height={120} priority />
          <div className={styles.productLabel}><Film size={17} /> Pixores Video Maker</div>
          <h1>Professional video editing, built for your desktop.</h1>
          <p className={styles.lead}>
            Edit, organize and render complete video projects on Windows with a magnetic timeline,
            audio tools, captions, Smart Clips and direct YouTube publishing.
          </p>
          <div className={styles.actions}>
            <a href={desktopDownloadUrl} className={styles.primaryAction}>
              <Download size={19} /> Download for Windows
            </a>
            <Link href="/video-maker" className={styles.secondaryAction}>Open the web editor</Link>
          </div>
          <div className={styles.releaseMeta}>
            <span>Version {version}</span><span>Windows 10/11 · 64-bit</span><span>Beta release</span>
          </div>
        </div>

        <div className={styles.productPreview} aria-label="Pixores Video Maker desktop preview">
          <div className={styles.windowBar}><i /><i /><i /><span>Pixores Video Maker</span></div>
          <div className={styles.previewCanvas}>
            <div className={styles.previewStage}><span>PREVIEW</span><strong>Create without limits.</strong></div>
            <div className={styles.previewTimeline}>
              <span /><span /><span />
              <i />
            </div>
          </div>
          <div className={styles.versionBadge}><MonitorDown size={18} /><span><strong>{version}</strong>Latest Windows beta</span></div>
        </div>
      </section>

      <section className={styles.featureSection} aria-labelledby="desktop-features">
        <div className={styles.sectionHeading}>
          <span>PIXORES VIDEO MAKER</span>
          <h2 id="desktop-features">From first cut to published video</h2>
          <p>One focused workspace for editing, audio, motion graphics, social formats and delivery.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, copy }) => (
            <article key={title} className={styles.featureCard}>
              <Icon size={21} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.downloadSection}>
        <div>
          <span>AVAILABLE NOW</span>
          <h2>Download Pixores Video Maker</h2>
          <p>The installer includes the desktop editor and the local media and rendering components.</p>
          <ul>
            <li><Check size={16} /> Automatic saving and reusable project packages</li>
            <li><Check size={16} /> NVIDIA GPU support with compatible hardware</li>
            <li><Check size={16} /> Secure Google OAuth connection for YouTube publishing</li>
          </ul>
        </div>
        <div className={styles.downloadCard}>
          <strong>Windows installer</strong>
          <span>{installerName}</span>
          <small>Approximately 635 MB</small>
          <a href={desktopDownloadUrl} className={styles.primaryAction}><Download size={18} /> Download {version}</a>
          <p>Beta software. Save your project before installing an update.</p>
        </div>
      </section>
    </main>
  );
}
