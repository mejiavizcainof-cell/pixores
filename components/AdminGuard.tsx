"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminGuardProps = {
  children: React.ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "signed-out">("checking");

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!active) return;

      if (!userData.user) {
        setStatus("signed-out");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!active) return;
      setStatus(!error && data?.role === "admin" ? "allowed" : "denied");
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return <AdminShell title="Checking admin access..." />;
  }

  if (status === "signed-out") {
    return (
      <AdminShell title="Please sign in first.">
        <p style={messageStyle}>Use the same account that has the admin role in Supabase.</p>
        <Link href="/" style={linkStyle}>Go to Pixores home</Link>
      </AdminShell>
    );
  }

  if (status === "denied") {
    return (
      <AdminShell title="Admin access required.">
        <p style={messageStyle}>Your account is signed in, but it does not have the admin role yet.</p>
      </AdminShell>
    );
  }

  return <>{children}</>;
}

function AdminShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main style={{ maxWidth: "900px", margin: "48px auto", padding: "24px" }}>
      <div style={{ border: "1px solid #E2E8F0", borderRadius: "16px", padding: "24px", background: "#FFFFFF" }}>
        <h1 style={{ margin: "0 0 10px", color: "#0F172A" }}>{title}</h1>
        {children}
      </div>
    </main>
  );
}

const messageStyle: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
};

const linkStyle: React.CSSProperties = {
  color: "#2563EB",
  fontWeight: 800,
};
