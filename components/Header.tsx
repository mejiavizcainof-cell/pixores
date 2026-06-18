"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { href: "/tools", label: "Tools" },
  { href: "/templates", label: "Templates" },
  { href: "/thumbnail-creator", label: "Studio" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
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
    <header
      style={{
        background: "rgba(255, 255, 255, 0.96)",
        borderBottom: "1px solid #E2E8F0",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "12px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <Image src="/logo.png" alt="Pixores" width={38} height={38} priority />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#2563EB", lineHeight: 1 }}>
              PIXORES
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Convert. Compress. Create.</div>
          </div>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flex: "1 1 auto",
            justifyContent: "center",
          }}
        >
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={navLinkStyle}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAdmin && (
            <Link href="/admin" style={adminButtonStyle}>
              Admin
            </Link>
          )}

          <AuthButton />

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Open menu"
            style={menuButtonStyle}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            padding: "10px 22px 18px",
            borderTop: "1px solid #E2E8F0",
            backgroundColor: "#FFFFFF",
          }}
        >
          {isAdmin && <Link href="/admin" style={mobileLinkStyle}>Admin Dashboard</Link>}
          <Link href="/" style={mobileLinkStyle}>Home</Link>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={mobileLinkStyle}>
              {item.label}
            </Link>
          ))}
          <Link href="/contact" style={mobileLinkStyle}>Contact</Link>
          <Link href="/es" style={mobileLinkStyle}>Spanish</Link>
        </nav>
      )}
    </header>
  );
}

const navLinkStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: "10px",
  color: "#334155",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 750,
};

const adminButtonStyle: React.CSSProperties = {
  padding: "9px 13px",
  borderRadius: "10px",
  background: "#0F172A",
  color: "#FFFFFF",
  textDecoration: "none",
  fontWeight: 850,
  fontSize: "14px",
};

const menuButtonStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: "10px",
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  cursor: "pointer",
  fontWeight: 800,
};

const mobileLinkStyle: React.CSSProperties = {
  padding: "12px 4px",
  color: "#0F172A",
  textDecoration: "none",
  fontWeight: 750,
};
