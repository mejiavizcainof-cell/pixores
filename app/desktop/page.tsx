import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AudioLines, Check, Cloud, Download, Film, Gauge, MonitorDown, ShieldCheck, Sparkles, Upload } from "lucide-react";
import packageInfo from "../../package.json";
import styles from "./DesktopPage.module.css";

export const metadata: Metadata = {
  title: "Download Pixores Video Maker Pro for Windows",
  description:
    "Download Pixores Video Maker Pro for Windows with Audio Studio, Smart Clips, local media, GPU rendering, captions and YouTube publishing.",
  alternates: { canonical: "https://www.pixores.com/desktop" },
  openGraph: {
    title: "Pixores Video Maker Pro",
    description: "Professional local video and audio creation for Windows with Audio Studio, Smart Clips, GPU rendering and direct YouTube publishing.",
    url: "https://www.pixores.com/desktop",
    siteName: "Pixores",
    type: "website",
  },
};

const version = packageInfo.version;
const installerName = `Pixores.Video.Maker.Pro.Setup.${version}.exe`;
const defaultDesktopDownloadUrl =
  `https://github.com/mejiavizcainof-cell/pixores/releases/download/pixores-video-maker-v${version}/${encodeURIComponent(installerName)}`;
const desktopDownloadUrl = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || defaultDesktopDownloadUrl;

const features = [
  { icon: Gauge, title: "Hybrid GPU rendering", copy: "Uses NVIDIA acceleration when available and preserves the full compositor for complex layers." },
  { icon: Sparkles, title: "Smart creative tools", copy: "Generate captions, remove silences, build Smart Clips and create automatic thumbnails." },
  { icon: AudioLines, title: "Pixores Audio Studio", copy: "Convert audio in batches, manage authorized link downloads and send finished files directly to video projects." },
  { icon: Upload, title: "Publish to YouTube", copy: "Upload large videos with resumable transfers, metadata, privacy controls and custom thumbnails." },
  { icon: ShieldCheck, title: "Local-first workflow", copy: "Projects, imported media and renders remain on your computer while you edit." },
];

const comparisonRows = [
  { feature: "Best for", quick: "Short, simple projects", pro: "Long-form and advanced projects" },
  { feature: "Where it runs", quick: "In your web browser", pro: "Installed locally on Windows" },
  { feature: "Rendering", quick: "Browser export", pro: "Local hybrid rendering with NVIDIA support" },
  { feature: "Media and projects", quick: "Browser workspace", pro: "Persistent local media, autosave and project packages" },
  { feature: "Advanced workflow", quick: "Essential timeline tools", pro: "Smart Clips, captions, Audio Studio, silence removal and YouTube publishing" },
  { feature: "Price", quick: "Free", pro: "Free during beta" },
];

export default function DesktopPage() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pixores Video Maker Pro",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Windows 10, Windows 11",
    softwareVersion: version,
    description: "A local-first Windows video editor with timeline editing, audio tools, captions, Smart Clips and hybrid GPU rendering.",
    downloadUrl: desktopDownloadUrl,
    publisher: { "@type": "Organization", name: "Pixores", url: "https://www.pixores.com" },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }}
      />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Image className={styles.wordmark} src="/pixores-logo-dark.png" alt="Pixores" width={445} height={120} priority />
          <div className={styles.productLabel}><Film size={17} /> Pixores Video Maker Pro</div>
          <h1>Professional video editing, built for your desktop.</h1>
          <p className={styles.lead}>
            Edit, organize and render complete video projects on Windows with a magnetic timeline,
            Audio Studio, captions, Smart Clips and direct YouTube publishing.
          </p>
          <div className={styles.actions}>
            <a href={desktopDownloadUrl} className={styles.primaryAction}>
              <Download size={19} /> Download for Windows
            </a>
            <Link href="/video-maker" className={styles.secondaryAction}>Open Pixores Quick Video Maker</Link>
          </div>
          <div className={styles.releaseMeta}>
            <span>Version {version}</span><span>Windows 10/11 · 64-bit</span><span>Beta release</span>
          </div>
        </div>

        <div className={styles.productPreview} aria-label="Pixores Video Maker desktop preview">
          <div className={styles.windowBar}><i /><i /><i /><span>Pixores Video Maker Pro</span></div>
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
          <span>PIXORES VIDEO MAKER PRO</span>
          <h2 id="desktop-features">From first cut to published video</h2>
          <p>One focused workspace for editing, Audio Studio, motion graphics, social formats and delivery.</p>
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

      <section className={styles.comparisonSection} aria-labelledby="compare-editors">
        <div className={styles.sectionHeadingLight}>
          <span>CHOOSE THE RIGHT WORKSPACE</span>
          <h2 id="compare-editors">Quick Video Maker or Video Maker Pro?</h2>
          <p>
            Both editors use the same Pixores approach, but they are designed for different jobs.
            Start online for speed; move to Pro when the project needs more media, control or rendering power.
          </p>
        </div>

        <div className={styles.comparisonCards}>
          <article className={styles.productCard}>
            <div className={styles.productCardIcon}><Cloud size={22} /></div>
            <span>WEB EDITOR</span>
            <h3>Pixores Quick Video Maker</h3>
            <p>Ideal for reels, shorts, announcements and quick edits from any modern browser.</p>
            <Link href="/video-maker" className={styles.secondaryAction}>Open Quick Video Maker</Link>
          </article>
          <article className={`${styles.productCard} ${styles.productCardPro}`}>
            <div className={styles.productCardIcon}><MonitorDown size={22} /></div>
            <span>WINDOWS EDITOR</span>
            <h3>Pixores Video Maker Pro</h3>
            <p>Recommended for longer projects, reusable assets, advanced audio and faster local rendering.</p>
            <a href={desktopDownloadUrl} className={styles.primaryAction}><Download size={18} /> Download Pro</a>
          </article>
        </div>

        <div className={styles.comparisonTableWrap}>
          <table className={styles.comparisonTable}>
            <thead><tr><th>Capability</th><th>Quick Video Maker</th><th>Video Maker Pro</th></tr></thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature}><th scope="row">{row.feature}</th><td>{row.quick}</td><td>{row.pro}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.betaNote}>Video Maker Pro is Windows-only and currently in beta. Features may change as stability and performance improve.</p>
      </section>

      <section className={styles.downloadSection}>
        <div>
          <span>AVAILABLE NOW</span>
          <h2>Download Pixores Video Maker Pro</h2>
          <p>The installer includes the desktop editor and the local media and rendering components.</p>
          <ul>
            <li><Check size={16} /> Automatic saving and reusable project packages</li>
            <li><Check size={16} /> NVIDIA GPU support with compatible hardware</li>
            <li><Check size={16} /> Local Audio Studio conversion and concurrent download queues</li>
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
