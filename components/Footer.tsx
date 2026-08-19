import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MonitorDown } from "lucide-react";
import styles from "./Footer.module.css";

const footerGroups = [
  {
    title: "Create",
    links: [
      { href: "/youtube-thumbnail-maker", label: "Thumbnail Maker" },
      { href: "/presentation-maker", label: "Presentation Maker" },
      { href: "/video-maker", label: "Quick Video Maker" },
      { href: "/audio-studio", label: "Audio Studio" },
      { href: "/desktop", label: "Video Maker Pro" },
      { href: "/templates", label: "Design Templates" },
    ],
  },
  {
    title: "Image tools",
    links: [
      { href: "/remove-background", label: "Remove Background" },
      { href: "/image-upscaler", label: "Image Upscaler" },
      { href: "/crop-image", label: "Crop Image" },
      { href: "/watermark-image", label: "Add Watermark" },
      { href: "/document-converter", label: "Word & PDF Converter" },
      { href: "/tools", label: "View all tools" },
    ],
  },
  {
    title: "Pixores",
    links: [
      { href: "/about", label: "About" },
      { href: "/editorial-policy", label: "Editorial Policy" },
      { href: "/research/image-format-timeline", label: "Image Format Research" },
      { href: "/blog", label: "Guides & Blog" },
      { href: "/faq", label: "Help Center" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
      { href: "/cookie-policy", label: "Cookie Policy" },
    ],
  },
];

const socialLinks = [
  {
    href: "https://www.instagram.com/pixorescreator/",
    label: "Instagram",
    icon: "/template-assets/social/instagram.svg",
  },
  {
    href: "https://www.facebook.com/profile.php?id=61591209140548",
    label: "Facebook",
    icon: "/template-assets/social/facebook.svg",
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brandColumn}>
          <Link href="/" className={styles.brand} aria-label="Pixores home">
            <Image src="/logo.png" alt="" width={42} height={42} />
            <span>PIXORES</span>
          </Link>
          <p>Create thumbnails, edit videos and prepare images with practical tools for the web and Windows.</p>
          <div className={styles.socialLinks} aria-label="Pixores social media">
            {socialLinks.map(({ href, label, icon }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer">
                <Image src={icon} alt="" width={17} height={17} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </div>
          <Link href="/desktop" className={styles.proLink}>
            <MonitorDown size={18} />
            <span><strong>Video Maker Pro</strong><small>Free Windows beta</small></span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <nav className={styles.linkGrid} aria-label="Footer navigation">
          {footerGroups.map((group) => (
            <div key={group.title} className={styles.linkGroup}>
              <h2>{group.title}</h2>
              {group.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} Pixores. All rights reserved.</p>
        <p>Web tools for quick work. Local Pro editing for larger projects.</p>
      </div>
    </footer>
  );
}
