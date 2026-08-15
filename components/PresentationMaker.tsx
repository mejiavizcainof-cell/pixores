"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Download, FilePlus2,
  ImagePlus, MonitorPlay, Palette, Plus, Save, Trash2, Upload, X,
} from "lucide-react";
import styles from "./PresentationMaker.module.css";

type Layout = "hero" | "split" | "statement" | "agenda";
type ThemeId = "aurora" | "midnight" | "editorial" | "sunset" | "ocean" | "mono";
type Slide = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  layout: Layout;
  theme: ThemeId;
  accent: string;
  image?: string;
};

const themes: Record<ThemeId, { name: string; background: string; foreground: string; muted: string; accent: string }> = {
  aurora: { name: "Aurora", background: "linear-gradient(135deg,#071a2c 0%,#123b4e 52%,#176b68 100%)", foreground: "#f8fafc", muted: "#bfe7e2", accent: "#5eead4" },
  midnight: { name: "Midnight", background: "radial-gradient(circle at 85% 18%,#4338ca 0%,#17113a 32%,#070711 72%)", foreground: "#ffffff", muted: "#c4b5fd", accent: "#a78bfa" },
  editorial: { name: "Editorial", background: "linear-gradient(115deg,#f8f5ed 0%,#ffffff 58%,#e5e7eb 100%)", foreground: "#111827", muted: "#64748b", accent: "#dc2626" },
  sunset: { name: "Sunset", background: "linear-gradient(135deg,#2b1027 0%,#9f2d42 46%,#f97316 100%)", foreground: "#fff7ed", muted: "#fed7aa", accent: "#facc15" },
  ocean: { name: "Ocean", background: "linear-gradient(135deg,#061a40,#0353a4 55%,#00a6a6)", foreground: "#f0f9ff", muted: "#bae6fd", accent: "#67e8f9" },
  mono: { name: "Monochrome", background: "linear-gradient(145deg,#09090b 0%,#27272a 100%)", foreground: "#fafafa", muted: "#d4d4d8", accent: "#ffffff" },
};

const starterSlides: Slide[] = [
  { id: "slide-cover", eyebrow: "PIXORES PRESENTS", title: "Ideas that deserve the room", subtitle: "A clear, modern presentation built to make every point memorable.", layout: "hero", theme: "aurora", accent: themes.aurora.accent },
  { id: "slide-story", eyebrow: "01 · THE OPPORTUNITY", title: "Turn attention into momentum", subtitle: "Lead with the insight. Support it with one meaningful idea. Make the next step impossible to miss.", layout: "split", theme: "midnight", accent: themes.midnight.accent },
  { id: "slide-close", eyebrow: "NEXT STEP", title: "Let’s build what comes next.", subtitle: "Thank you · pixores.com", layout: "statement", theme: "editorial", accent: themes.editorial.accent },
];

function newId() { return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function SlideCanvas({ slide, thumbnail = false }: { slide: Slide; thumbnail?: boolean }) {
  const theme = themes[slide.theme];
  const style = {
    "--slide-bg": theme.background,
    "--slide-fg": theme.foreground,
    "--slide-muted": theme.muted,
    "--slide-accent": slide.accent || theme.accent,
  } as React.CSSProperties;
  return (
    <div className={`${styles.slideCanvas} ${styles[slide.layout]} ${thumbnail ? styles.thumbnailCanvas : ""}`} style={style}>
      <span className={styles.decorOne} /><span className={styles.decorTwo} />
      <div className={styles.slideContent}>
        <span className={styles.slideEyebrow}>{slide.eyebrow || "SECTION"}</span>
        <h2>{slide.title || "Untitled presentation"}</h2>
        <p>{slide.subtitle || "Add a supporting thought for your audience."}</p>
      </div>
      {slide.layout === "agenda" && <div className={styles.agendaMarks}><span>01</span><span>02</span><span>03</span></div>}
      {slide.image && <div className={styles.slideImage}><Image src={slide.image} alt="Uploaded presentation visual" fill unoptimized sizes="40vw" /></div>}
      <span className={styles.slideNumber}>PIXORES</span>
    </div>
  );
}

export default function PresentationMaker() {
  const [slides, setSlides] = useState<Slide[]>(starterSlides);
  const [selectedId, setSelectedId] = useState(starterSlides[0].id);
  const [presenting, setPresenting] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const draftLoadedRef = useRef(false);
  const selectedIndex = Math.max(0, slides.findIndex((slide) => slide.id === selectedId));
  const selected = slides[selectedIndex] || slides[0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("pixores-presentation-draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Slide[];
          if (Array.isArray(parsed) && parsed.length) { setSlides(parsed); setSelectedId(parsed[0].id); }
        } catch { /* Ignore invalid local drafts. */ }
      }
      draftLoadedRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (draftLoadedRef.current) window.localStorage.setItem("pixores-presentation-draft", JSON.stringify(slides)); }, [slides]);

  useEffect(() => {
    if (!presenting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); setPresentIndex((value) => Math.min(slides.length - 1, value + 1)); }
      if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); setPresentIndex((value) => Math.max(0, value - 1)); }
      if (event.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presenting, slides.length]);

  const updateSlide = (patch: Partial<Slide>) => setSlides((current) => current.map((slide) => slide.id === selectedId ? { ...slide, ...patch } : slide));
  const addSlide = () => {
    const slide: Slide = { id: newId(), eyebrow: "NEW SECTION", title: "A strong new idea", subtitle: "Use this space to explain the point your audience should remember.", layout: "split", theme: selected?.theme || "aurora", accent: selected?.accent || themes.aurora.accent };
    setSlides((current) => [...current, slide]); setSelectedId(slide.id);
  };
  const duplicateSlide = () => {
    if (!selected) return;
    const copy = { ...selected, id: newId(), title: `${selected.title} (copy)` };
    setSlides((current) => [...current.slice(0, selectedIndex + 1), copy, ...current.slice(selectedIndex + 1)]); setSelectedId(copy.id);
  };
  const removeSlide = () => {
    if (slides.length === 1) return;
    const next = slides.filter((slide) => slide.id !== selectedId);
    setSlides(next); setSelectedId(next[Math.min(selectedIndex, next.length - 1)].id);
  };
  const moveSlide = (direction: -1 | 1) => {
    const target = selectedIndex + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides]; [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]]; setSlides(next);
  };

  const uploadImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader(); reader.onload = () => updateSlide({ image: String(reader.result) }); reader.readAsDataURL(file);
  };
  const saveProject = () => {
    const blob = new Blob([JSON.stringify({ type: "pixores-presentation", version: 1, slides }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "pixores-presentation.json"; link.click(); URL.revokeObjectURL(url);
  };
  const openProject = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { slides?: Slide[] };
      if (!Array.isArray(parsed.slides) || !parsed.slides.length) throw new Error("Invalid project");
      setSlides(parsed.slides); setSelectedId(parsed.slides[0].id);
    } catch { window.alert("This is not a valid Pixores presentation project."); }
  };

  const exportPowerPoint = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const pptxModule = await import("pptxgenjs");
      const PptxGenJS = pptxModule.default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "Pixores Presentation Maker";
      pptx.subject = "Editable presentation created with Pixores";
      pptx.title = slides[0]?.title || "Pixores Presentation";
      pptx.company = "Pixores";
      slides.forEach((item, index) => {
        const slide = pptx.addSlide();
        const theme = themes[item.theme];
        const bg = item.theme === "editorial" ? "F8F5ED" : item.theme === "sunset" ? "5A1832" : item.theme === "ocean" ? "073B6D" : item.theme === "midnight" ? "0B0920" : item.theme === "mono" ? "18181B" : "0B3141";
        slide.background = { color: bg };
        slide.addShape(pptx.ShapeType.rect, { x: .7, y: .78, w: .58, h: .08, fill: { color: item.accent.replace("#", "") }, line: { transparency: 100 } });
        slide.addText(item.eyebrow || "SECTION", { x: .7, y: .48, w: 8.5, h: .25, fontFace: "Aptos", fontSize: 10, bold: true, charSpacing: 2, color: item.accent.replace("#", ""), margin: 0 });
        const textWidth = item.image ? 7.1 : 11.5;
        slide.addText(item.title || "Untitled presentation", { x: .68, y: 1.18, w: textWidth, h: 2.25, fontFace: "Aptos Display", fontSize: item.layout === "statement" ? 34 : 39, bold: true, color: theme.foreground.replace("#", ""), breakLine: false, margin: 0, valign: "middle", fit: "shrink" });
        slide.addText(item.subtitle || "", { x: .72, y: 3.72, w: item.image ? 6.6 : 9.8, h: 1.3, fontFace: "Aptos", fontSize: 17, color: theme.muted.replace("#", ""), margin: 0, breakLine: false, fit: "shrink" });
        if (item.image) slide.addImage({ data: item.image, x: 8.55, y: 1.15, w: 4.1, h: 4.7, transparency: 0 });
        slide.addText(String(index + 1).padStart(2, "0"), { x: 11.9, y: 6.82, w: .7, h: .2, fontFace: "Aptos", fontSize: 9, color: theme.muted.replace("#", ""), align: "right", margin: 0 });
      });
      await pptx.writeFile({ fileName: "pixores-presentation.pptx" });
    } catch (error) { console.error(error); window.alert("The PowerPoint file could not be created."); }
    finally { setExporting(false); }
  };

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div><span className={styles.productMark}>P</span><div><h1>Presentation Maker</h1><small>Saved automatically on this device</small></div></div>
        <div className={styles.topActions}>
          <input ref={projectInputRef} hidden type="file" accept=".json" onChange={(event) => void openProject(event.target.files?.[0])} />
          <button type="button" onClick={() => projectInputRef.current?.click()}><Upload size={16} /> <span>Open</span></button>
          <button type="button" onClick={saveProject}><Save size={16} /> <span>Save</span></button>
          <button type="button" onClick={() => { setPresentIndex(selectedIndex); setPresenting(true); }}><MonitorPlay size={16} /> <span>Present</span></button>
          <button type="button" className={styles.exportButton} disabled={exporting} onClick={() => void exportPowerPoint()}><Download size={16} /> <span>{exporting ? "Exporting…" : "PowerPoint"}</span></button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.slideRail}>
          <div className={styles.railHeader}><strong>{slides.length} slides</strong><button type="button" onClick={addSlide} aria-label="Add slide"><Plus size={17} /></button></div>
          <div className={styles.slideList}>{slides.map((slide, index) => <button type="button" key={slide.id} className={`${styles.slideThumb} ${slide.id === selectedId ? styles.selectedThumb : ""}`} onClick={() => setSelectedId(slide.id)}><span>{index + 1}</span><SlideCanvas slide={slide} thumbnail /></button>)}</div>
          <button type="button" className={styles.addSlide} onClick={addSlide}><FilePlus2 size={17} /> Add slide</button>
        </aside>

        <section className={styles.stage} aria-label="Presentation canvas">
          <div className={styles.canvasToolbar}>
            <div><button type="button" disabled={selectedIndex === 0} onClick={() => moveSlide(-1)} title="Move slide up"><ChevronUp size={17} /></button><button type="button" disabled={selectedIndex === slides.length - 1} onClick={() => moveSlide(1)} title="Move slide down"><ChevronDown size={17} /></button></div>
            <div><button type="button" onClick={duplicateSlide}><Copy size={16} /> Duplicate</button><button type="button" disabled={slides.length === 1} onClick={removeSlide}><Trash2 size={16} /> Delete</button></div>
          </div>
          <div className={styles.canvasFrame}>{selected && <SlideCanvas slide={selected} />}</div>
          <p className={styles.stageHint}>16:9 widescreen · Everything remains editable in the exported .pptx</p>
        </section>

        <aside className={styles.inspector}>
          <div className={styles.inspectorTitle}><Palette size={18} /><strong>Design & content</strong></div>
          <label>Template<div className={styles.themeGrid}>{(Object.keys(themes) as ThemeId[]).map((id) => <button type="button" key={id} className={`${styles.themeChoice} ${selected?.theme === id ? styles.activeTheme : ""}`} onClick={() => updateSlide({ theme: id, accent: themes[id].accent })}><span style={{ background: themes[id].background }} /><small>{themes[id].name}</small></button>)}</div></label>
          <label>Layout<select value={selected?.layout || "hero"} onChange={(event) => updateSlide({ layout: event.target.value as Layout })}><option value="hero">Hero</option><option value="split">Split image</option><option value="statement">Big statement</option><option value="agenda">Agenda</option></select></label>
          <label>Section label<input value={selected?.eyebrow || ""} onChange={(event) => updateSlide({ eyebrow: event.target.value })} /></label>
          <label>Headline<textarea rows={3} value={selected?.title || ""} onChange={(event) => updateSlide({ title: event.target.value })} /></label>
          <label>Supporting text<textarea rows={4} value={selected?.subtitle || ""} onChange={(event) => updateSlide({ subtitle: event.target.value })} /></label>
          <label>Accent color<div className={styles.colorRow}><input type="color" value={selected?.accent || "#5eead4"} onChange={(event) => updateSlide({ accent: event.target.value })} /><code>{selected?.accent}</code></div></label>
          <label>Image<input ref={fileInputRef} hidden type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} /><button type="button" className={styles.imageButton} onClick={() => fileInputRef.current?.click()}><ImagePlus size={17} /> {selected?.image ? "Replace image" : "Add image"}</button>{selected?.image && <button type="button" className={styles.removeImage} onClick={() => updateSlide({ image: undefined })}><X size={15} /> Remove image</button>}</label>
        </aside>
      </div>

      {presenting && <div className={styles.presenter} role="dialog" aria-modal="true" aria-label="Presentation mode"><SlideCanvas slide={slides[presentIndex]} /><button type="button" className={styles.closePresenter} onClick={() => setPresenting(false)} aria-label="Close presentation"><X /></button><button type="button" className={`${styles.presenterArrow} ${styles.previous}`} disabled={presentIndex === 0} onClick={() => setPresentIndex((value) => value - 1)}><ChevronLeft /></button><button type="button" className={`${styles.presenterArrow} ${styles.next}`} disabled={presentIndex === slides.length - 1} onClick={() => setPresentIndex((value) => value + 1)}><ChevronRight /></button><span className={styles.presenterCount}>{presentIndex + 1} / {slides.length}</span></div>}
    </div>
  );
}
