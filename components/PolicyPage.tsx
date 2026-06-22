import type { ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import styles from "./InfoPages.module.css";

export type PolicySection = {
  id: string;
  title: string;
  content: ReactNode;
};

type PolicyPageProps = {
  title: string;
  description: string;
  lastUpdated: string;
  notice: string;
  sections: PolicySection[];
};

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms-of-service", label: "Terms" },
  { href: "/cookie-policy", label: "Cookies" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function PolicyPage({ title, description, lastUpdated, notice, sections }: PolicyPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}><FileText size={17} /> Pixores policies</span>
          <h1>{title}</h1>
          <p className={styles.heroDescription}>{description}</p>
          <p className={styles.meta}>Last updated: {lastUpdated}</p>
          <nav className={styles.legalNav} aria-label="Policy pages">
            {legalLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
        </div>
      </header>

      <div className={styles.contentGrid}>
        <aside className={styles.toc}>
          <strong>On this page</strong>
          <nav aria-label={`${title} sections`}>
            {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
          </nav>
        </aside>

        <article className={styles.article}>
          <div className={styles.notice}>{notice}</div>
          {sections.map((section) => (
            <section key={section.id} id={section.id} className={styles.section}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
