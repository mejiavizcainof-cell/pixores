"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabaseClient";
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

const downloadItems = [
  { href: "/youtube-thumbnail-maker", label: "Thumbnail Creator" },
  { href: "/video-maker", label: "Pixores Video Maker" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!active) return;

      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (active) setIsAdmin(data?.role === "admin");
    };

    void checkAdmin();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link
          href="/"
          className={styles.brand}
          onClick={() => setMenuOpen(false)}
        >
          <Image className={styles.brandImage} src="/logo.png" alt="Pixores" width={38} height={38} priority />
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
              <span>Download</span>
              <ChevronDown size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <div className={styles.downloadMenu} role="menu" aria-label="Download editors">
              {downloadItems.map((item) => (
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
          {isAdmin && (
            <Link href="/admin" className={styles.adminButton}>
              Admin
            </Link>
          )}

          <AuthButton />

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={styles.menuButton}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {isAdmin && <Link href="/admin" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>}
          <Link href="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/tools" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Tools</Link>
          <div className={styles.mobileDownloadGroup}>
            <span className={styles.mobileDownloadTitle}>Download</span>
            {downloadItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>
          {navItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Contact</Link>
          <Link href="/es" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Spanish</Link>
        </nav>
      )}
    </header>
  );
}
