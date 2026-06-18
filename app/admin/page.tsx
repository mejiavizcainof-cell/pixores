"use client";

import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

const adminCards = [
  {
    title: "Blog Posts",
    description: "Create, edit, publish, and improve SEO content.",
    href: "/admin/blog",
  },
  {
    title: "Asset Library",
    description: "Upload people, objects, backgrounds, shapes, frames, and templates.",
    href: "/admin/assets",
  },
];

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <main style={{ maxWidth: "1100px", margin: "36px auto", padding: "20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "#2563EB", fontWeight: 900, margin: 0 }}>Pixores Admin</p>
          <h1 style={{ margin: "6px 0", color: "#0F172A", fontSize: "34px" }}>Content Dashboard</h1>
          <p style={{ color: "#64748B", margin: 0, maxWidth: "680px", lineHeight: 1.6 }}>
            Manage the content and design assets that feed Pixores tools.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {adminCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              style={{
                display: "block",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                padding: "20px",
                background: "#FFFFFF",
                color: "inherit",
                textDecoration: "none",
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
              }}
            >
              <h2 style={{ margin: "0 0 8px", color: "#0F172A", fontSize: "20px" }}>{card.title}</h2>
              <p style={{ margin: 0, color: "#64748B", lineHeight: 1.5 }}>{card.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </AdminGuard>
  );
}
