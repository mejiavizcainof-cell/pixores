"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Crop,
  Download,
  Eraser,
  FileImage,
  FileOutput,
  Gauge,
  ImageDown,
  ImagePlus,
  Images,
  Maximize2,
  Palette,
  RefreshCw,
  Search,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import styles from "./DiscoveryPages.module.css";

const tools = [
  { title: "Pixores Thumbnail Maker", href: "/youtube-thumbnail-maker", description: "Build YouTube thumbnails with layers, text, frames, and templates.", category: "Creator", badge: "Featured", icon: Palette },
  { title: "Pixores Video Maker", href: "/video-maker", description: "Create short social videos with media, text overlays, social formats, and WebM export.", category: "Creator", badge: "New", icon: Video },
  { title: "Design Templates", href: "/templates", description: "Start with editable designs for YouTube, Instagram, Facebook, sports, gaming, and business.", category: "Creator", badge: "Featured", icon: Images },
  { title: "AI Background Remover", href: "/remove-background", description: "Remove an image background and download a transparent PNG.", category: "AI", badge: "AI", icon: WandSparkles },
  { title: "AI Image Upscaler", href: "/image-upscaler", description: "Increase image resolution by 2x or 4x while preserving important details.", category: "AI", badge: "AI", icon: Sparkles },
  { title: "Crop Image", href: "/crop-image", description: "Crop visually or enter exact width, height, and position values.", category: "Edit", icon: Crop },
  { title: "Add Watermark", href: "/watermark-image", description: "Add custom text or logo watermarks to one image or a batch.", category: "Edit", icon: ImagePlus },
  { title: "Rotate and Flip Image", href: "/rotate-image", description: "Correct orientation and flip an image horizontally or vertically.", category: "Edit", icon: RefreshCw },
  { title: "Resize Image", href: "/resize-image", description: "Change image dimensions while controlling output size and quality.", category: "Optimize", icon: Maximize2 },
  { title: "Compress Image", href: "/compress-image", description: "Reduce image file size while preserving useful visual quality.", category: "Optimize", icon: ImageDown },
  { title: "Favicon Generator", href: "/favicon-generator", description: "Generate the standard favicon sizes needed for a website.", category: "Creator", icon: Gauge },
  { title: "JPG to PNG", href: "/jpg-to-png", description: "Convert JPG images to PNG format.", category: "Convert", icon: FileOutput },
  { title: "PNG to JPG", href: "/png-to-jpg", description: "Convert PNG files to compact JPG images.", category: "Convert", icon: FileImage },
  { title: "JPG to WebP", href: "/jpg-to-webp", description: "Convert JPG images to modern WebP format.", category: "Convert", icon: FileOutput },
  { title: "PNG to WebP", href: "/png-to-webp", description: "Convert PNG images to efficient WebP files.", category: "Convert", icon: FileOutput },
  { title: "WebP to JPG", href: "/webp-to-jpg", description: "Turn WebP images into widely supported JPG files.", category: "Convert", icon: Download },
  { title: "WebP to PNG", href: "/webp-to-png", description: "Convert WebP images to PNG format.", category: "Convert", icon: Download },
  { title: "HEIC to JPG", href: "/heic-to-jpg", description: "Convert iPhone HEIC photos to compatible JPG files.", category: "Convert", icon: FileImage },
  { title: "JPG to PDF", href: "/jpg-to-pdf", description: "Combine JPG images into a downloadable PDF document.", category: "Convert", icon: FileOutput },
  { title: "Instagram Reel Saver Guide", href: "/instagram-reel-downloader", description: "Learn safe options for saving Reels you own or have permission to use.", category: "Other", icon: Video },
];

const categories = ["All", "Creator", "AI", "Edit", "Optimize", "Convert", "Other"];

export default function ToolsExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tools.filter((tool) =>
      (category === "All" || tool.category === category)
      && (!normalizedQuery || `${tool.title} ${tool.description} ${tool.category}`.toLowerCase().includes(normalizedQuery)),
    );
  }, [category, query]);

  return (
    <div className={styles.page}>
      <header className={styles.toolsHero}>
        <div className={styles.toolsHeroInner}>
          <div className={styles.brandRow}><Eraser size={20} /> Pixores toolkit</div>
          <h1>Image tools for everyday creative work</h1>
          <p>Convert, edit, optimize, and create images without installing complicated software.</p>
        </div>
      </header>

      <section className={styles.toolsControls} aria-label="Find a Pixores tool">
        <div className={styles.search}><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" aria-label="Search tools" /></div>
        <div className={styles.filters}>
          {categories.map((item) => <button type="button" key={item} className={category === item ? styles.activeFilter : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </section>

      <section className={styles.toolResults}>
        <div className={styles.resultsMeta}>{filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"}</div>
        {filteredTools.length ? (
          <div className={styles.toolGrid}>
            {filteredTools.map(({ icon: Icon, ...tool }) => (
              <Link key={tool.href} href={tool.href} className={styles.toolCard}>
                <div className={styles.toolCardTop}><span className={styles.toolIcon}><Icon size={20} /></span><span className={styles.toolBadge}>{tool.badge || tool.category}</span></div>
                <h2>{tool.title}</h2><p>{tool.description}</p><span className={styles.toolArrow}>Open tool <ArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        ) : <div className={styles.emptyTools}>No tools matched your search.</div>}
      </section>
    </div>
  );
}
