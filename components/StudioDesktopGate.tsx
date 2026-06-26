"use client";

import { Suspense, useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";
import ThumbnailEditorV2 from "@/components/ThumbnailEditorV2";
import { supabase } from "@/lib/supabaseClient";

type AuthState = "checking" | "signed-out" | "signed-in";

export default function StudioDesktopGate() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setUserEmail(data.session?.user.email || null);
      setAuthState(data.session?.user ? "signed-in" : "signed-out");
    };

    void checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email || null);
      setAuthState(session?.user ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (authState === "checking") {
    return (
      <div style={screenStyle}>
        <div style={panelStyle}>
          <strong style={{ fontSize: "20px", color: "#0F172A" }}>Checking your Pixores account...</strong>
          <p style={copyStyle}>Pixores Studio Desktop requires an active Pixores login.</p>
        </div>
      </div>
    );
  }

  if (authState === "signed-out") {
    return (
      <div style={screenStyle}>
        <div style={panelStyle}>
          <div style={logoStyle}>P</div>
          <h1 style={{ margin: "0", fontSize: "30px", color: "#0F172A" }}>Pixores Studio Desktop</h1>
          <p style={copyStyle}>
            Sign in to use the desktop editor, sync your projects, access My Brand, and keep credits connected to your account.
          </p>
          <AuthButton />
          <p style={{ ...copyStyle, fontSize: "13px", marginTop: "14px" }}>
            The desktop app works with the same Pixores account you use online.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={screenStyle}>Loading Pixores Studio...</div>}>
      <ThumbnailEditorV2 />
      <div
        title={userEmail || undefined}
        style={{
          position: "fixed",
          left: "14px",
          bottom: "14px",
          zIndex: 2147483647,
          padding: "7px 10px",
          borderRadius: "999px",
          background: "rgba(15, 23, 42, 0.88)",
          color: "#FFFFFF",
          fontSize: "12px",
          fontWeight: 800,
          pointerEvents: "none",
        }}
      >
        Desktop signed in
      </div>
    </Suspense>
  );
}

const screenStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 48%, #EEF2FF 100%)",
};

const panelStyle: React.CSSProperties = {
  width: "min(520px, 100%)",
  border: "1px solid #DBEAFE",
  borderRadius: "22px",
  background: "#FFFFFF",
  padding: "34px",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)",
  textAlign: "center",
};

const logoStyle: React.CSSProperties = {
  width: "58px",
  height: "58px",
  margin: "0 auto 16px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  background: "#2563EB",
  color: "#FFFFFF",
  fontWeight: 950,
  fontSize: "28px",
};

const copyStyle: React.CSSProperties = {
  color: "#64748B",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: "12px 0 22px",
};
