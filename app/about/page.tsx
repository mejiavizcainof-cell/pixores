import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers3, LockKeyhole, MonitorSmartphone, MousePointer2, Sparkles, Zap } from "lucide-react";
import styles from "@/components/DiscoveryPages.module.css";

export const metadata: Metadata = {
  title: "About Pixores",
  description: "Learn about Pixores, our browser-first image tools, creator studio, templates, privacy approach, and mission.",
  alternates: { canonical: "https://www.pixores.com/about" },
};

const values = [
  { icon: MousePointer2, title: "Easy by design", description: "Clear controls and practical defaults help people finish common image tasks without a manual." },
  { icon: LockKeyhole, title: "Privacy aware", description: "We use local browser processing whenever possible and limit server processing to the requested operation." },
  { icon: Zap, title: "Fast workflows", description: "Tools are focused, responsive, and designed to move from upload to useful result quickly." },
];

const pillars = [
  { icon: Layers3, title: "Pixores Studio", description: "A layer-based editor for thumbnails, social graphics, text, frames, personal brand assets, and exports.", href: "/thumbnail-creator", link: "Open Studio" },
  { icon: Sparkles, title: "AI image tools", description: "Background removal and image upscaling make advanced edits accessible through straightforward controls.", href: "/tools", link: "Explore AI tools" },
  { icon: MonitorSmartphone, title: "Everyday utilities", description: "Conversion, compression, resizing, cropping, watermarks, and more across desktop and mobile.", href: "/tools", link: "Browse all tools" },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brandRow}><Image src="/logo.png" alt="Pixores" width={30} height={30} /> Built for creators and everyday image work</div>
          <h1>About Pixores</h1>
          <p className={styles.heroText}>Pixores brings practical image tools, editable templates, and a capable creator studio together in one accessible browser-based workspace.</p>
          <div className={styles.heroActions}>
            <Link href="/thumbnail-creator" className={styles.primaryButton}>Open Pixores Studio <ArrowRight size={17} /></Link>
            <Link href="/tools" className={styles.secondaryButton}>Explore all tools</Link>
          </div>
        </div>
      </header>

      <section className={styles.trustRow} aria-label="Pixores product principles">
        <div className={styles.trustItem}><strong>20+</strong><span>Creator and image tools</span></div>
        <div className={styles.trustItem}><strong>Browser-first</strong><span>No complicated software installation</span></div>
        <div className={styles.trustItem}><strong>Mobile-ready</strong><span>Designed for phone, tablet, and desktop</span></div>
      </section>

      <section className={styles.missionBand}>
        <div className={styles.missionInner}>
          <h2>Our mission</h2>
          <p>Image creation should feel approachable, not technical. Pixores is built to help creators, students, marketers, developers, and small businesses prepare visual content efficiently while keeping controls understandable and results reusable.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><span>How we build</span><h2>Useful tools with fewer obstacles</h2><p>Each Pixores feature is shaped around a real task, from a quick format conversion to a complete thumbnail design.</p></div>
        <div className={styles.valueGrid}>{values.map(({ icon: Icon, title, description }) => <article key={title} className={styles.valueCard}><div className={styles.valueIcon}><Icon size={20} /></div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><span>What Pixores offers</span><h2>From quick fixes to finished designs</h2><p>Focused utilities work alongside Studio and templates, so users can choose the workflow that matches the job.</p></div>
        <div className={styles.pillarGrid}>{pillars.map(({ icon: Icon, title, description, href, link }) => <article key={title} className={styles.pillarCard}><div className={styles.pillarIcon}><Icon size={20} /></div><h3>{title}</h3><p>{description}</p><Link href={href}>{link} <ArrowRight size={13} /></Link></article>)}</div>
      </section>

      <section className={styles.cta}>
        <div><h2>Help shape what comes next</h2><p>Bug reports, workflow feedback, and thoughtful tool ideas help Pixores improve.</p></div>
        <Link href="/contact">Contact the team</Link>
      </section>
    </div>
  );
}
