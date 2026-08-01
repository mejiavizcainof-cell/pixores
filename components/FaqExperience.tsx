"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle, Mail, Search } from "lucide-react";
import styles from "./InfoPages.module.css";

const faqItems = [
  { category: "General", question: "Is Pixores free?", answer: "Many Pixores tools are free to use. AI features and saved creator workflows may use credits or require an account when clearly indicated." },
  { category: "General", question: "Do I need to create an account?", answer: "No account is required for standard conversion and browser-based tools. An account is needed for features such as saved projects, My Brand assets, and credit-based AI tools." },
  { category: "Privacy", question: "Are my files stored?", answer: "Browser-based tools process files locally whenever possible. Tools that require server processing retain files only as needed to complete the requested operation, subject to our Privacy Policy." },
  { category: "Files", question: "What image formats are supported?", answer: "Format support depends on the tool. Pixores currently works with common formats including JPG, PNG, WebP, HEIC, PDF-related images, and transparent PNG files." },
  { category: "Mobile", question: "Can I use Pixores on a phone or tablet?", answer: "Yes. Pixores is designed for smartphones, tablets, laptops, and desktop computers. Mobile upload controls can access your camera or photo library where supported." },
  { category: "Files", question: "Is there a file size limit?", answer: "Limits vary by tool, browser memory, and server resources. Large files may take longer to process, especially on mobile devices." },
  { category: "Files", question: "Does Pixores support batch processing?", answer: "Selected tools support multiple files, including the watermark tool and several conversion workflows. Availability is shown directly on each tool page." },
  { category: "Privacy", question: "How does Pixores protect my files?", answer: "We minimize retention, use secure connections, and process files only for the requested operation. You should still avoid uploading confidential material to any online service unless necessary." },
  { category: "Thumbnail Maker", question: "Can I save designs and templates?", answer: "Signed-in users can save projects. Administrators can also publish and update public templates through Pixores Thumbnail Maker." },
  { category: "Thumbnail Maker", question: "Can I download transparent images?", answer: "Yes. Pixores Thumbnail Maker supports transparent PNG export, and the Background Remover lets you download images without a background." },
  { category: "Video Maker", question: "What is the difference between Quick Video Maker and Video Maker Pro?", answer: "Quick Video Maker runs in the browser and is designed for short, straightforward edits. Video Maker Pro is a Windows application for longer projects, persistent local media, advanced audio, Smart Clips, captions and local GPU-assisted rendering." },
  { category: "Video Maker", question: "Is Pixores Video Maker Pro free?", answer: "Yes. Pixores Video Maker Pro is currently free during its Windows beta. The download page always shows the current release status and system requirements." },
  { category: "Video Maker", question: "Which editor should I use for long videos?", answer: "Use Video Maker Pro for long videos or projects with many clips and effects. Local files, autosave and GPU-assisted rendering provide a more dependable workflow than a browser for larger timelines." },
  { category: "Video Maker", question: "Does Video Maker Pro upload my media to Pixores?", answer: "The Pro editor is local-first: imported media, project files and renders stay on your computer while you edit. Optional connected features, such as YouTube publishing, only send data when you choose to use them." },
  { category: "Support", question: "How can I contact Pixores?", answer: "Email support@pixores.com or use the Contact page. Include the tool name, browser, device, and a short description of the issue." },
];

const categories = ["All", ...Array.from(new Set(faqItems.map((item) => item.category)))];

export default function FaqExperience() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return faqItems.filter((item) =>
      (category === "All" || item.category === category)
      && (!normalizedQuery || `${item.question} ${item.answer}`.toLowerCase().includes(normalizedQuery)),
    );
  }, [category, query]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}><HelpCircle size={17} /> Help center</span>
          <h1>Frequently Asked Questions</h1>
          <p className={styles.heroDescription}>Clear answers about files, privacy, accounts, Thumbnail Maker, Quick Video Maker and Video Maker Pro.</p>
        </div>
      </header>

      <section className={styles.faqControls} aria-label="Search frequently asked questions">
        <div className={styles.searchBox}><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions" aria-label="Search questions" /></div>
        <div className={styles.categoryTabs}>
          {categories.map((item) => <button type="button" key={item} className={category === item ? styles.activeTab : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </section>

      <div className={styles.faqLayout}>
        <div className={styles.faqList}>
          {filteredItems.length ? filteredItems.map((item) => (
            <details className={styles.faqItem} key={item.question}>
              <summary>{item.question}</summary>
              <div className={styles.faqAnswer}><p>{item.answer}</p></div>
            </details>
          )) : <div className={styles.emptyState}>No questions matched your search.</div>}
        </div>

        <aside className={styles.supportCard}>
          <div className={styles.supportIcon}><Mail size={20} /></div>
          <h2>Still need help?</h2>
          <p>Tell us which Pixores tool you are using and what happened.</p>
          <Link className={styles.primaryLink} href="/contact">Contact Support</Link>
        </aside>
      </div>
    </div>
  );
}
