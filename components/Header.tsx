"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabaseClient";
import { isPixoresDesktopMode } from "@/components/DesktopModeHost";
import styles from "./Header.module.css";

const navItems = [
  { href: "/tools", label: "Tools" },
  { href: "/remove-background", label: "AI Background Remover" },
  { href: "/image-upscaler", label: "Upscaler" },
  { href: "/crop-image", label: "Crop Image" },
  { href: "/watermark-image", label: "Watermark" },
  { href: "/templates", label: "Templates" },
  { href: "/youtube-thumbnail-maker", label: "Thumbnail Maker" },
  { href: "/desktop", label: "Desktop" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  useEffect(() => {
    setIsDesktopMode(isPixoresDesktopMode());
  }, []);

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

  if (isDesktopMode) return null;

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
          {navItems.map((item) => (
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
          {navItems.map((item) => (
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
