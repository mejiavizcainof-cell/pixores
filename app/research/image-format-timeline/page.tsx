import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata, SITE_URL } from "@/lib/seo";
import styles from "./timeline.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Image Format History Timeline: GIF, JPEG, PNG, WebP & AVIF",
  description:
    "Compare the history, release dates, creators, capabilities, and primary specifications of GIF, JPEG, PNG, WebP, and AVIF. Download the Pixores reference dataset.",
  path: "/research/image-format-timeline",
  keywords: [
    "image format history",
    "PNG history",
    "GIF history",
    "JPEG history",
    "WebP history",
    "AVIF history",
  ],
});

const timeline = [
  {
    year: "1987",
    format: "GIF87a",
    organization: "CompuServe",
    summary: "Introduced portable indexed-color graphics and LZW compression for online services.",
    source: "https://www.w3.org/Graphics/GIF/spec-gif87.txt",
  },
  {
    year: "1989",
    format: "GIF89a",
    organization: "CompuServe",
    summary: "Added graphic-control information, timing, transparency indication, comments, and extensions.",
    source: "https://www.w3.org/Graphics/GIF/spec-gif89a.txt",
  },
  {
    year: "1992",
    format: "JPEG",
    organization: "ISO/IEC and ITU-T",
    summary: "Standardized practical lossy compression for continuous-tone photographic images.",
    source: "https://jpeg.org/jpeg/",
  },
  {
    year: "1996",
    format: "PNG 1.0",
    organization: "W3C",
    summary: "Standardized an open lossless format with richer color, integrity checks, and alpha transparency.",
    source: "https://www.w3.org/TR/PNG-History.html",
  },
  {
    year: "2010",
    format: "WebP",
    organization: "Google",
    summary: "Introduced a web-focused format that later combined lossy, lossless, alpha, and animation modes.",
    source: "https://developers.google.com/speed/webp/docs/riff_container",
  },
  {
    year: "2019",
    format: "AVIF",
    organization: "Alliance for Open Media",
    summary: "Defined AV1 image storage in HEIF for high compression efficiency, HDR, and wide color workflows.",
    source: "https://aomediacodec.github.io/av1-avif/",
  },
];

const capabilities = [
  { format: "GIF", compression: "Lossless, indexed", transparency: "Single transparent palette entry", animation: "Yes", bestFor: "Simple limited-color loops" },
  { format: "JPEG", compression: "Lossy", transparency: "No", animation: "No", bestFor: "Photographs and continuous tone" },
  { format: "PNG", compression: "Lossless", transparency: "Full alpha", animation: "APNG extension", bestFor: "Screenshots, diagrams, and cutouts" },
  { format: "WebP", compression: "Lossy or lossless", transparency: "Alpha", animation: "Yes", bestFor: "General modern web delivery" },
  { format: "AVIF", compression: "Lossy or lossless", transparency: "Alpha", animation: "Image sequences", bestFor: "Efficient photos, HDR, and wide color" },
];

export default function ImageFormatTimelinePage() {
  const canonicalUrl = `${SITE_URL}/research/image-format-timeline`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Pixores Image Format History and Capabilities Dataset",
      description:
        "A curated chronology and capability comparison for GIF, JPEG, PNG, WebP, and AVIF based on primary specifications.",
      url: canonicalUrl,
      datePublished: "2026-08-15",
      dateModified: "2026-08-15",
      creator: {
        "@type": "Organization",
        name: "Pixores Editorial Team",
        url: `${SITE_URL}/editorial-policy`,
      },
      distribution: {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_URL}/research/image-format-history.csv`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Research", item: canonicalUrl },
        { "@type": "ListItem", position: 3, name: "Image Format Timeline", item: canonicalUrl },
      ],
    },
  ];

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Pixores original reference</p>
        <h1>Image format history: an evidence-based timeline</h1>
        <p className={styles.lede}>
          A compact chronology of GIF, JPEG, PNG, WebP, and AVIF, paired with a capability matrix and downloadable source data. Dates and technical claims are tied to primary specifications.
        </p>
        <div className={styles.actions}>
          <a href="/research/image-format-history.csv" download className={styles.primaryAction}>
            Download the CSV dataset
          </a>
          <Link href="/blog/history-of-png" className={styles.secondaryAction}>
            Read the PNG origin story
          </Link>
        </div>
        <p className={styles.reviewed}>Published and reviewed August 15, 2026 · Maintained by the Pixores Editorial Team</p>
      </header>

      <section className={styles.section} aria-labelledby="timeline-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>1987–2019</p>
          <h2 id="timeline-title">The modern web-image timeline</h2>
        </div>
        <ol className={styles.timeline}>
          {timeline.map((event) => (
            <li key={`${event.year}-${event.format}`}>
              <time dateTime={event.year}>{event.year}</time>
              <div>
                <h3>{event.format}</h3>
                <p className={styles.organization}>{event.organization}</p>
                <p>{event.summary}</p>
                <a href={event.source} target="_blank" rel="noreferrer">
                  View primary source ↗
                </a>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="matrix-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Capability matrix</p>
          <h2 id="matrix-title">What each format was built to do</h2>
          <p>“Newer” does not automatically mean “better.” The correct format depends on the source image, required features, delivery size, and compatibility target.</p>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Format</th>
                <th>Compression</th>
                <th>Transparency</th>
                <th>Animation</th>
                <th>Typical strength</th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map((item) => (
                <tr key={item.format}>
                  <th scope="row">{item.format}</th>
                  <td>{item.compression}</td>
                  <td>{item.transparency}</td>
                  <td>{item.animation}</td>
                  <td>{item.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.methodology} aria-labelledby="methodology-title">
        <div>
          <p className={styles.eyebrow}>Methodology</p>
          <h2 id="methodology-title">How this reference was assembled</h2>
        </div>
        <div>
          <p>
            The chronology uses the first named public specification or standards milestone shown in the linked primary source. Capability labels describe the format family rather than every decoder, encoder, browser, or optional extension.
          </p>
          <p>
            When citing this resource, use: <strong>Pixores Editorial Team, “Image Format History: An Evidence-Based Timeline,” August 15, 2026.</strong> Link to this page so readers can inspect the methodology and latest corrections.
          </p>
        </div>
      </section>

      <section className={styles.related} aria-labelledby="deep-dives-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Primary-source deep dives</p>
          <h2 id="deep-dives-title">Continue with the full histories</h2>
        </div>
        <div className={styles.cardGrid}>
          <Link href="/blog/history-of-gif"><strong>GIF history</strong><span>GIF87a, GIF89a, LZW, animation, and internet culture.</span></Link>
          <Link href="/blog/history-of-png"><strong>PNG history</strong><span>The 1994 project, its creators, transparency, and open-web purpose.</span></Link>
          <Link href="/blog/history-of-jpeg"><strong>JPEG history</strong><span>How perceptual compression made digital photography practical.</span></Link>
          <Link href="/blog/history-of-webp"><strong>WebP history</strong><span>Google&apos;s attempt to reduce the weight of web imagery.</span></Link>
        </div>
      </section>
    </main>
  );
}
