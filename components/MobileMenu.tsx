"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import styles from "./Header.module.css";

type MenuItem = { href: string; label: string };

type MobileMenuProps = {
  navItems: MenuItem[];
  creatorItems: MenuItem[];
};

export default function MobileMenu({ navItems, creatorItems }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className={styles.menuButton}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          <Link href="/" className={styles.mobileLink} onClick={closeMenu}>Home</Link>
          <Link href="/tools" className={styles.mobileLink} onClick={closeMenu}>Tools</Link>
          <div className={styles.mobileDownloadGroup}>
            <span className={styles.mobileDownloadTitle}>Create</span>
            {creatorItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={closeMenu}>
                {item.label}
              </Link>
            ))}
          </div>
          {navItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
          <Link href="/research/image-format-timeline" className={styles.mobileLink} onClick={closeMenu}>Research</Link>
          <Link href="/contact" className={styles.mobileLink} onClick={closeMenu}>Contact</Link>
          <Link href="/es" className={styles.mobileLink} onClick={closeMenu}>Spanish</Link>
        </nav>
      )}
    </>
  );
}

