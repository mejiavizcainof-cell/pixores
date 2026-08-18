import Link from "next/link";
import { toolGuides, type ToolGuideKey } from "@/lib/toolGuides";
import styles from "./ToolSeo.module.css";

type ToolSeoProps = {
  title: string;
  description: string;
  benefits?: string[];
  tool?: ToolGuideKey;
};

export default function ToolSeo({ title, description, benefits, tool }: ToolSeoProps) {
  const guide = tool ? toolGuides[tool] : undefined;

  if (!guide) {
    return (
      <section className={styles.guide}>
        <div className={styles.intro}>
          <span>Pixores tool guide</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {benefits?.length ? <ul className={styles.simpleList}>{benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : null}
      </section>
    );
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className={styles.guide} aria-labelledby={`${tool}-guide-title`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />

      <header className={styles.intro}>
        <span>Reviewed Pixores tool guide</span>
        <h2 id={`${tool}-guide-title`}>{title}</h2>
        <p>{description}</p>
        {guide.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <small>Behavior and limits reviewed against the current Pixores implementation on August 14, 2026.</small>
      </header>

      <dl className={styles.facts}>
        {guide.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      </dl>

      <div className={styles.columns}>
        <section>
          <h3>How to use this tool</h3>
          <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section>
          <h3>When it is a good fit</h3>
          <ul>{guide.bestFor.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <section className={styles.caution}>
        <h3>Limitations to check</h3>
        <ul>{guide.watchFor.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className={styles.privacy}>
        <h3>File handling and privacy</h3>
        <p>{guide.privacy}</p>
      </section>

      <section className={styles.faq}>
        <h3>Frequently asked questions</h3>
        {guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
      </section>

      <nav className={styles.related} aria-label="Related Pixores guides">
        <strong>Continue with:</strong>
        {guide.related.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        <Link href="/editorial-policy">How Pixores reviews guides</Link>
      </nav>
    </section>
  );
}
