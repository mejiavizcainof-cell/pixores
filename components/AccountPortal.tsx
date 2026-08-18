"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Film, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAuthRedirectUrl } from "@/lib/authRedirect";
import styles from "./AccountPortal.module.css";

type AccountPortalProps = {
  initialMode?: "login" | "signup";
  initialMessage?: string;
};

export default function AccountPortal({ initialMode = "login", initialMessage = "" }: AccountPortalProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [signedInEmail, setSignedInEmail] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedInEmail(data.session?.user.email || ""));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email || "");
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function submit() {
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl("/account?confirmed=1"),
        },
      });
      setLoading(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      if (data.session?.user) setSignedInEmail(data.session.user.email || cleanEmail);
      setMessage(data.session ? "Your account is ready." : "Account created. Check your email to confirm it, then sign in to Pixores Video Maker Pro.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);
    if (error || !data.user) {
      setMessage(error?.message || "Sign in failed.");
      return;
    }
    setSignedInEmail(data.user.email || cleanEmail);
    setMessage("Signed in successfully. You can return to Pixores Video Maker Pro.");
  }

  async function requestPasswordReset() {
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Enter your email address first, then choose Forgot password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getAuthRedirectUrl("/reset-password"),
    });
    setLoading(false);
    setMessage(error ? error.message : "Password reset email sent. Check your inbox and spam folder.");
  }

  async function signOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSignedInEmail("");
    setMessage("Signed out successfully.");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}><span><Film size={22} /></span> Pixores</Link>
        {signedInEmail ? (
          <div className={styles.success}>
            <CheckCircle2 size={42} />
            <h1>Your Pixores account is ready</h1>
            <p>Signed in as <strong>{signedInEmail}</strong>. Return to Pixores Video Maker Pro to continue.</p>
            <div className={styles.successActions}>
              <Link href="/tools">Explore Pixores tools <ArrowRight size={17} /></Link>
              <button type="button" onClick={() => void signOut()} disabled={loading}>
                {loading ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className={styles.eyebrow}>One account · Web and desktop</span>
            <h1>{mode === "signup" ? "Create your Pixores account" : "Sign in to Pixores"}</h1>
            <p>Use the same account for Quick Video Maker, Thumbnail Maker, cloud projects, and Pixores Video Maker Pro.</p>
            <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              <label>Email address<span><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></span></label>
              <label>Password<span><LockKeyhole size={17} /><input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></span></label>
              {mode === "signup" && <label>Confirm password<span><LockKeyhole size={17} /><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></span></label>}
              <button className={styles.submit} type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}<ArrowRight size={17} /></button>
              {mode === "login" && <button className={styles.forgot} type="button" disabled={loading} onClick={() => void requestPasswordReset()}>Forgot password?</button>}
            </form>
            <p className={styles.message} role="status">{message}</p>
            <button className={styles.switch} type="button" onClick={() => { setMode((current) => current === "login" ? "signup" : "login"); setMessage(""); }}>
              {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
