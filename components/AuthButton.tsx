"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
      if (session?.user) setModalOpen(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const createCreditsIfNeeded = async (userId: string) => {
    const { data } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (!data) {
      await supabase.from("user_credits").insert({
        user_id: userId,
        credits: 5,
      });
    }
  };

  const validateForm = () => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValid) {
      alert("Please enter a valid email address.");
      return false;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return false;
    }

    if (mode === "signup" && password !== confirmPassword) {
      alert("Passwords do not match.");
      return false;
    }

    return true;
  };

  const signUp = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data.user) {
      await createCreditsIfNeeded(data.user.id);
    }

    alert("Account created successfully. You can now log in.");
    setMode("login");
  };

  const signIn = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data.user) {
      await createCreditsIfNeeded(data.user.id);
    }

    setModalOpen(false);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });
  };

  const resetPassword = async () => {
  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  );

  if (error) {
    alert(error.message);
    return;
  }

  alert("Password reset email sent.");
};

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  if (userEmail) {
    return (
      <div style={{ display: "flex", gap: "7px", alignItems: "center", minWidth: 0 }}>
        <span
          title={userEmail}
          style={{
            maxWidth: "128px",
            overflow: "hidden",
            color: "#334155",
            fontSize: "12px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail}
        </span>
        <button onClick={signOut} style={buttonStyle}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          setMode("login");
          setModalOpen(true);
        }}
        style={buttonStyle}
      >
        Login / Sign Up
      </button>

      {modalOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <button onClick={() => setModalOpen(false)} style={closeStyle}>
              ×
            </button>

            <h2 style={{ margin: "0 0 6px", color: "#0F172A" }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p style={{ margin: "0 0 18px", color: "#64748B", fontSize: "14px" }}>
              Save your designs, projects, and AI background removals.
            </p>

            <button onClick={signInWithGoogle} style={googleButtonStyle}>
              Continue with Google
            </button>

            <div style={dividerStyle}>or</div>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={modalInputStyle}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={modalInputStyle}
            />

            {mode === "signup" && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={modalInputStyle}
              />
            )}

            <button
              onClick={mode === "login" ? signIn : signUp}
              disabled={loading}
              style={{
                ...buttonStyle,
                width: "100%",
                padding: "12px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>

            {mode === "login" && (
  <button
    onClick={resetPassword}
    style={{
      width: "100%",
      border: "none",
      background: "transparent",
      color: "#2563EB",
      cursor: "pointer",
      fontWeight: 600,
      marginTop: "10px",
    }}
  >
    Forgot Password?
  </button>
)}

            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              style={switchStyle}
            >
              {mode === "login"
                ? "Need an account? Sign up"
                : "Already have an account? Login"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "none",
  borderRadius: "8px",
  background: "#2563EB",
  color: "#FFFFFF",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  background: "#FFFFFF",
  borderRadius: "18px",
  padding: "26px",
  position: "relative",
  boxShadow: "0 25px 80px rgba(0,0,0,0.25)",
};

const closeStyle: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  right: "14px",
  border: "none",
  background: "transparent",
  fontSize: "26px",
  cursor: "pointer",
  color: "#64748B",
};

const modalInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  fontSize: "14px",
  marginBottom: "10px",
};

const googleButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  background: "#FFFFFF",
  color: "#0F172A",
  fontWeight: 700,
  cursor: "pointer",
};

const dividerStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#94A3B8",
  fontSize: "13px",
  margin: "16px 0",
};

const switchStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#2563EB",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: "14px",
};
