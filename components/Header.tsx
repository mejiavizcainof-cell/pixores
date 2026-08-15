import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import MobileMenu from "@/components/MobileMenu";
import styles from "./Header.module.css";

const navItems = [
  { href: "/tools", label: "Tools" },
  { href: "/templates", label: "Templates" },
  { href: "/remove-background", label: "Remove BG" },
  { href: "/image-upscaler", label: "Upscaler" },
  { href: "/crop-image", label: "Crop Image" },
  { href: "/watermark-image", label: "Watermark" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

const creatorItems = [
  { href: "/youtube-thumbnail-maker", label: "Thumbnail Creator" },
  { href: "/presentation-maker", label: "Presentation Maker" },
  { href: "/video-maker", label: "Quick Video Maker" },
  { href: "/desktop", label: "Video Maker Pro" },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link
          href="/"
          className={styles.brand}
        >
          <Image className={styles.brandImage} src="/logo.png" alt="Pixores" width={38} height={38} loading="eager" />
          <div>
            <div className={styles.brandName}>PIXORES</div>
            <div className={styles.brandTagline}>Convert. Compress. Create.</div>
          </div>
        </Link>

        <nav className={styles.desktopNav} aria-label="Main navigation">
          <Link href="/tools" className={styles.navLink}>
            Tools
          </Link>

          <div className={styles.downloadDropdown}>
            <button type="button" className={styles.downloadButton} aria-haspopup="true">
              <span>Create</span>
              <ChevronDown size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <div className={styles.downloadMenu} role="menu" aria-label="Pixores creator tools">
              {creatorItems.map((item) => (
                <Link key={item.href} href={item.href} className={styles.downloadMenuItem} role="menuitem">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {navItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/account" className={styles.accountButton}>
            Account
          </Link>
          <MobileMenu navItems={navItems} creatorItems={creatorItems} />
        </div>
      </div>
    </header>
  );
}
