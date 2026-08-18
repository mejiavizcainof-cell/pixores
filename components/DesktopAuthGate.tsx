"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, ExternalLink, Eye, EyeOff, LockKeyhole, LogOut, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getPixoresDesktopBridge, isPixoresDesktop } from "@/src/video-maker/adapters/runtime";
import styles from "./DesktopAuthGate.module.css";

type DesktopAuthGateProps = {
  children: ReactNode;
  required?: boolean;
  showAccountDock?: boolean;
  experience?: "desktop" | "online";
};

type DesktopAuthContextValue = {
  userEmail: string;
};

type AuthState = "checking" | "signed-out" | "signed-in";

const PIXORES_WEBSITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pixores.com").replace(/\/$/, "");
let cachedSignedInEmail = "";
const DesktopAuthContext = createContext<DesktopAuthContextValue>({ userEmail: "" });

export function useDesktopAuth() {
  return useContext(DesktopAuthContext);
}

export default function DesktopAuthGate({ children, required = true, showAccountDock = true, experience = "desktop" }: DesktopAuthGateProps) {
  const [mustAuthenticate, setMustAuthenticate] = useState(required);
  const [authState, setAuthState] = useState<AuthState>(required ? "checking" : "signed-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("Sign in with the Pixores account you use on the web.");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(cachedSignedInEmail);
  const authContextValue = useMemo(() => ({ userEmail }), [userEmail]);

  useEffect(() => {
    let active = true;
    const nextMustAuthenticate = required || isPixoresDesktop();
    queueMicrotask(() => {
      if (!active) return;
      setMustAuthenticate(nextMustAuthenticate);
      setAuthState(nextMustAuthenticate ? "checking" : "signed-in");
    });

    if (!nextMustAuthenticate) {
      return () => {
        active = false;
      };
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const sessionEmail = data.session?.user.email || "";
      cachedSignedInEmail = sessionEmail;
      setUserEmail(sessionEmail);
      setAuthState(data.session?.user && !error ? "signed-in" : "signed-out");
      if (error) setMessage("Your session expired. Sign in again to continue.");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (!session && event !== "INITIAL_SESSION" && event !== "SIGNED_OUT") return;
      cachedSignedInEmail = session?.user.email || "";
      setUserEmail(cachedSignedInEmail);
      setAuthState(session?.user ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [required]);

  async function signIn() {
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);
    setMessage("Checking your Pixores account...");
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);
    if (error || !data.user) {
      setMessage(error?.message || "Sign in failed. Check your email and password.");
      return;
    }

    cachedSignedInEmail = data.user.email || cleanEmail;
    setUserEmail(cachedSignedInEmail);
    setPassword("");
    setAuthState("signed-in");
  }

  async function resetPassword() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setMessage("Enter your email first, then choose Forgot password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${PIXORES_WEBSITE_URL}/reset-password`,
    });
    setLoading(false);
    setMessage(error ? error.message : "Password reset email sent.");
  }

  async function openWebsiteAccount() {
    const url = `${PIXORES_WEBSITE_URL}/account?mode=signup`;
    const bridge = getPixoresDesktopBridge();
    if (bridge?.openExternalUrl) {
      await bridge.openExternalUrl(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function signOut() {
    await supabase.auth.signOut();
    cachedSignedInEmail = "";
    setUserEmail("");
    setAuthState("signed-out");
    setMessage(`You signed out. Sign in to use Pixores ${experience === "desktop" ? "Video Maker Pro" : "creator tools"}.`);
  }

  if (!mustAuthenticate) return children;

  if (authState === "checking") {
    return (
      <main className={styles.screen} aria-live="polite">
        <section className={styles.checkingCard}>
          <span className={styles.brandIcon}><Image src="/logo.png" alt="" width={44} height={44} priority /></span>
          <div className={styles.loadingRing} />
          <h1>Starting Pixores</h1>
          <p>Verifying your secure account session...</p>
        </section>
      </main>
    );
  }

  if (authState === "signed-out") {
    return (
      <main className={styles.screen}>
        <div className={styles.ambientOne} />
        <div className={styles.ambientTwo} />
        <section className={styles.authLayout}>
          <div className={styles.pitchPanel}>
            <span className={styles.brand}><span className={styles.brandIcon}><Image src="/logo.png" alt="" width={44} height={44} priority /></span> Pixores</span>
            <span className={styles.eyebrow}>Professional video creation</span>
            <h1>Your studio.<br />Your stories.</h1>
            <p>Edit, animate, create social clips, and export professional video from one focused workspace.</p>
            <ul>
              <li><ShieldCheck size={18} /> Your projects stay connected to your Pixores account</li>
              <li><ShieldCheck size={18} /> Local desktop rendering and project files</li>
              <li><ShieldCheck size={18} /> One account for Pixores web and desktop tools</li>
            </ul>
          </div>

          <form className={styles.loginCard} onSubmit={(event) => { event.preventDefault(); void signIn(); }}>
            <span className={styles.secureLabel}><LockKeyhole size={15} /> Secure account access</span>
            <h2>Welcome back</h2>
            <p>Sign in before entering Pixores {experience === "desktop" ? "Video Maker Pro" : "creator tools"}.</p>

            <label>
              Email address
              <span className={styles.inputShell}><Mail size={18} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span>
            </label>
            <label>
              Password
              <span className={styles.inputShell}>
                <LockKeyhole size={18} />
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters or more" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>

            <div className={styles.loginMeta}>
              <button type="button" onClick={() => void resetPassword()} disabled={loading}>Forgot password?</button>
            </div>
            <button className={styles.signInButton} type="submit" disabled={loading}>{loading ? "Signing in..." : <>Sign In <ArrowRight size={18} /></>}</button>
            <p className={styles.message} role="status">{message}</p>
            <div className={styles.divider}><span>New to Pixores?</span></div>
            <button className={styles.createButton} type="button" onClick={() => void openWebsiteAccount()}>
              Create Account on Pixores.com <ExternalLink size={16} />
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <DesktopAuthContext.Provider value={authContextValue}>
      {children}
      {showAccountDock && <div className={styles.accountDock} title={userEmail}>
        <span>{userEmail.slice(0, 1).toUpperCase()}</span>
        <div><small>Signed in</small><strong>{userEmail}</strong></div>
        <button type="button" onClick={() => void signOut()} aria-label="Sign out of Pixores"><LogOut size={16} /></button>
      </div>}
    </DesktopAuthContext.Provider>
  );
}
