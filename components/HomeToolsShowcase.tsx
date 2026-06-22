"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Crop,
  FileOutput,
  ImageDown,
  ImagePlus,
  Images,
  Layers3,
  Maximize2,
  Palette,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import styles from "./DiscoveryPages.module.css";

const featuredTools = [
  { title: "Pixores Studio", href: "/thumbnail-creator", description: "Design thumbnails and social graphics with editable layers.", category: "Create", badge: "Featured", icon: Layers3 },
  { title: "Design Templates", href: "/templates", description: "Customize ready-made layouts for popular social formats.", category: "Create", badge: "Featured", icon: Palette },
  { title: "AI Background Remover", href: "/remove-background", description: "Remove backgrounds and download a transparent PNG.", category: "AI", badge: "AI", icon: WandSparkles },
  { title: "AI Image Upscaler", href: "/image-upscaler", description: "Increase resolution with AI-powered enhancement.", category: "AI", badge: "AI", icon: Sparkles },
  { title: "Crop Image", href: "/crop-image", description: "Crop visually or enter exact pixel dimensions.", category: "Edit", icon: Crop },
  { title: "Add Watermark", href: "/watermark-image", description: "Protect images with custom text or a logo.", category: "Edit", icon: ImagePlus },
  { title: "Compress Image", href: "/compress-image", description: "Reduce file size while preserving useful quality.", category: "Optimize", icon: ImageDown },
  { title: "Resize Image", href: "/resize-image", description: "Change image dimensions for web and social media.", category: "Optimize", icon: Maximize2 },
  { title: "JPG to PNG", href: "/jpg-to-png", description: "Convert JPG images to PNG format.", category: "Convert", icon: FileOutput },
  { title: "PNG to JPG", href: "/png-to-jpg", description: "Convert PNG images to compact JPG files.", category: "Convert", icon: Images },
];

const categories = ["All", "Create", "AI", "Edit", "Optimize", "Convert"];

export default function HomeToolsShowcase() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return featuredTools.filter((tool) =>
      (category === "All" || tool.category === category)
      && (!normalizedQuery || `${tool.title} ${tool.description}`.toLowerCase().includes(normalizedQuery)),
    );
  }, [category, query]);

  return (
    <section className={styles.homeToolsSection}>
      <div className={styles.homeToolsHeader}>
        <div><span>Pixores toolkit</span><h2>Find the right tool and get to work</h2><p>Create, edit, optimize, and convert images without leaving the browser.</p></div>
        <Link href="/tools" className={styles.viewAllLink}>View all tools <ArrowRight size={15} /></Link>
      </div>

      <div className={styles.toolsControls} aria-label="Find a tool on the Pixores home page">
        <div className={styles.search}><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search featured tools" aria-label="Search featured tools" /></div>
        <div className={styles.filters}>{categories.map((item) => <button type="button" key={item} className={category === item ? styles.activeFilter : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>

      <div className={styles.toolResults}>
        <div className={styles.resultsMeta}>{results.length} featured {results.length === 1 ? "tool" : "tools"}</div>
        {results.length ? <div className={styles.toolGrid}>{results.map(({ icon: Icon, ...tool }) => <Link key={tool.href} href={tool.href} className={styles.toolCard}><div className={styles.toolCardTop}><span className={styles.toolIcon}><Icon size={20} /></span><span className={styles.toolBadge}>{tool.badge || tool.category}</span></div><h2>{tool.title}</h2><p>{tool.description}</p><span className={styles.toolArrow}>Open tool <ArrowRight size={14} /></span></Link>)}</div> : <div className={styles.emptyTools}>No featured tools matched your search.</div>}
      </div>
    </section>
  );
}
