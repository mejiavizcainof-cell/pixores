import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import HomeToolsShowcase from "@/components/HomeToolsShowcase";
import SiteIdentitySchema from "@/components/SiteIdentitySchema";
import { blogPosts } from "@/lib/blogPosts";
import styles from "./HomePage.module.css";

export const metadata: Metadata = {
  title: "Free YouTube Thumbnail Maker, Templates & Image Tools",
  description: "Create professional YouTube thumbnails with Pixores Thumbnail Maker, customize templates, and use fast online image tools.",
  alternates: {
    canonical: "https://www.pixores.com",
    languages: {
      en: "https://www.pixores.com",
      es: "https://www.pixores.com/es",
    },
  },
};

const benefits = [
  { title: "Free core tools", description: "Convert, resize, compress, and optimize images without a subscription." },
  { title: "No registration required", description: "Use standard image tools immediately. Sign in only for saved projects and AI features." },
  { title: "Fast processing", description: "Complete everyday image tasks quickly from desktop or mobile." },
  { title: "Secure workflows", description: "Files are processed only to complete the image task you request." },
  { title: "Professional creator tools", description: "Build thumbnails, prepare graphics, and enhance images in one place." },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <SiteIdentitySchema />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Create with confidence</p>
          <h1>Pixores Thumbnail Maker</h1>
          <p className={styles.heroText}>Create professional thumbnails with flexible text, layers, backgrounds, frames, and reusable assets. Start from scratch or customize a ready-made template.</p>
          <div className={styles.heroActions}>
            <Link href="/youtube-thumbnail-maker" className={styles.primaryButton}>Open Thumbnail Maker <ArrowRight size={17} /></Link>
            <Link href="/templates" className={styles.secondaryButton}>Browse Templates</Link>
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.whyGrid}>
          <div className={styles.whyIntro}>
            <p>Made for everyday creators</p>
            <h2>Why Pixores?</h2>
            <span>Simple image tools should feel quick, dependable, and easy to use. Pixores brings essential editing and creator workflows together without unnecessary complexity.</span>
          </div>
          <div className={styles.benefits}>
            {benefits.map((benefit) => <article key={benefit.title}><div className={styles.checkIcon}><Check size={16} /></div><div><h3>{benefit.title}</h3><p>{benefit.description}</p></div></article>)}
          </div>
        </div>
      </section>

      <HomeToolsShowcase />

      <section className={styles.guidesSection}>
        <div className={styles.sectionHeading}>
          <span>Learn and create</span>
          <h2>Latest image editing guides</h2>
          <p>Learn how to create better thumbnails, optimize images, and improve your visual content.</p>
        </div>

        <div className={styles.guideGrid}>
          {blogPosts.slice(0, 3).map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.guideCard}>
              <span>Guide</span>
              <h3>{post.title}</h3>
              <p>{post.description}</p>
              <b>Read article <ArrowRight size={14} /></b>
            </Link>
          ))}
        </div>

        <div className={styles.guidesAction}><Link href="/blog">View all articles <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  );
}
