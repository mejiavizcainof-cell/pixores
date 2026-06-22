import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Clock3, CreditCard, Lightbulb, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import styles from "@/components/InfoPages.module.css";

export const metadata: Metadata = {
  title: "Contact Pixores Support",
  description: "Contact Pixores for technical support, bug reports, billing questions, privacy requests, feedback, or feature suggestions.",
  alternates: { canonical: "https://www.pixores.com/contact" },
};

const topics = [
  { icon: Bug, title: "Technical support", description: "Report a tool, upload, conversion, editor, or download problem." },
  { icon: CreditCard, title: "Billing and credits", description: "Questions about purchases, credits, or account transactions." },
  { icon: Lightbulb, title: "Feature requests", description: "Suggest a new tool or improvement for Pixores Studio." },
  { icon: ShieldCheck, title: "Privacy requests", description: "Ask about account data, saved content, or privacy rights." },
];

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}><MessageSquareText size={17} /> Pixores support</span>
          <h1>How can we help?</h1>
          <p className={styles.heroDescription}>Send us a clear description of your question, problem, or idea. We read every support message.</p>
        </div>
      </header>

      <section className={styles.contactGrid}>
        <div className={styles.contactLead}>
          <h2>Contact the Pixores team</h2>
          <p>For faster help, include the name of the tool, your browser and device, what you expected, and what happened. Never email passwords, API keys, payment card details, or private files.</p>
          <div className={styles.emailPanel}>
            <span>SUPPORT EMAIL</span>
            <a href="mailto:support@pixores.com?subject=Pixores%20Support%20Request">support@pixores.com</a>
          </div>
          <div className={styles.responseNote}><Clock3 size={15} /> Response times may vary based on request volume.</div>
        </div>

        <div className={styles.topicList}>
          {topics.map(({ icon: Icon, title, description }) => <article className={styles.topic} key={title}><Icon size={21} /><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>

      <section className={styles.contactCta}>
        <div className={styles.contactCtaInner}>
          <div><h2>Check the Help Center first</h2><p>Common questions about accounts, files, privacy, mobile use, and exports are answered there.</p></div>
          <Link href="/faq" className={styles.primaryLink}><Mail size={17} /> Open FAQ</Link>
        </div>
      </section>
    </div>
  );
}
