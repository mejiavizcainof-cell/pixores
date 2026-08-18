import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cloud, Layers3, LockKeyhole, MonitorDown, MonitorSmartphone, MousePointer2, Sparkles, Zap } from "lucide-react";
import styles from "@/components/DiscoveryPages.module.css";

export const metadata: Metadata = {
  title: "About Pixores",
  description: "Learn how Pixores combines image tools, Thumbnail Maker, Quick Video Maker and the free Windows Video Maker Pro in one creator ecosystem.",
  alternates: { canonical: "https://www.pixores.com/about" },
};

const values = [
  { icon: MousePointer2, title: "Easy by design", description: "Clear controls and practical defaults help people finish common image tasks without a manual." },
  { icon: LockKeyhole, title: "Privacy aware", description: "We use local browser processing whenever possible and limit server processing to the requested operation." },
  { icon: Zap, title: "Fast workflows", description: "Tools are focused, responsive, and designed to move from upload to useful result quickly." },
];

const pillars = [
  { icon: Layers3, title: "Pixores Thumbnail Maker", description: "A layer-based editor for YouTube thumbnails, social graphics, text, frames, personal brand assets, and exports.", href: "/youtube-thumbnail-maker", link: "Open Thumbnail Maker" },
  { icon: Cloud, title: "Pixores Quick Video Maker", description: "A streamlined browser editor for short videos, social formats, text overlays and quick exports without installing software.", href: "/video-maker", link: "Open Quick Video Maker" },
  { icon: MonitorDown, title: "Pixores Video Maker Pro", description: "A Windows editor for long-form projects with local media, timeline editing, GPU-assisted rendering, audio tools, captions and Smart Clips.", href: "/desktop", link: "Compare and download" },
  { icon: Sparkles, title: "AI image tools", description: "Background removal and image upscaling make advanced edits accessible through straightforward controls.", href: "/tools", link: "Explore AI tools" },
  { icon: MonitorSmartphone, title: "Everyday utilities", description: "Conversion, compression, resizing, cropping, watermarks, and more across desktop and mobile.", href: "/tools", link: "Browse all tools" },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brandRow}><Image src="/logo.png" alt="Pixores" width={30} height={30} /> Image and video tools for everyday creators</div>
          <h1>About Pixores</h1>
          <p className={styles.heroText}>Pixores brings practical image utilities, a professional thumbnail workspace, quick online video editing and a more powerful local Windows editor into one connected creator toolkit.</p>
          <div className={styles.heroActions}>
            <Link href="/video-maker" className={styles.primaryButton}>Open Quick Video Maker <ArrowRight size={17} /></Link>
            <Link href="/desktop" className={styles.secondaryButton}>Explore Video Maker Pro</Link>
            <Link href="/tools" className={styles.secondaryButton}>Explore all tools</Link>
          </div>
        </div>
      </header>

      <section className={styles.trustRow} aria-label="Pixores product principles">
        <div className={styles.trustItem}><strong>20+</strong><span>Image, design and creator tools</span></div>
        <div className={styles.trustItem}><strong>Web + Windows</strong><span>Choose quick browser editing or local Pro workflows</span></div>
        <div className={styles.trustItem}><strong>Local-first Pro</strong><span>Persistent media and rendering stay on your computer</span></div>
      </section>

      <section className={styles.missionBand}>
        <div className={styles.missionInner}>
          <h2>Our mission</h2>
          <p>Visual creation should feel approachable, not technical. Pixores helps creators, students, marketers and small businesses move from a quick image conversion to a finished thumbnail or complete video while keeping controls understandable, projects reusable and processing appropriate to the job.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><span>How we build</span><h2>Useful tools with fewer obstacles</h2><p>Each Pixores feature is shaped around a real task, from a quick format conversion to a complete thumbnail or long-form video project.</p></div>
        <div className={styles.valueGrid}>{values.map(({ icon: Icon, title, description }) => <article key={title} className={styles.valueCard}><div className={styles.valueIcon}><Icon size={20} /></div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className={styles.missionBand}>
        <div className={styles.missionInner}>
          <h2>How we publish guidance</h2>
          <p>Pixores guides are maintained by the Pixores Editorial Team. We review product behavior against the current implementation, link to primary platform documentation when requirements can change, disclose meaningful limitations, and consolidate pages that do not offer a distinct useful answer. Read our <Link href="/editorial-policy">editorial policy and correction standards</Link>.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><span>What Pixores offers</span><h2>From quick fixes to published videos</h2><p>Focused utilities work alongside the Thumbnail Maker and two distinct video editors, so users can choose the workflow that matches the job and their device.</p></div>
        <div className={styles.pillarGrid}>{pillars.map(({ icon: Icon, title, description, href, link }) => <article key={title} className={styles.pillarCard}><div className={styles.pillarIcon}><Icon size={20} /></div><h3>{title}</h3><p>{description}</p><Link href={href}>{link} <ArrowRight size={13} /></Link></article>)}</div>
      </section>

      <section className={styles.cta}>
        <div><h2>Help shape what comes next</h2><p>Bug reports, workflow feedback, and thoughtful tool ideas help Pixores improve.</p></div>
        <Link href="/contact">Contact the team</Link>
      </section>
    </div>
  );
}
