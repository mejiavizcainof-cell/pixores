"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./ResetPassword.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Checking your secure recovery link...");

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const ready = Boolean(data.session && !error);
      setRecoveryReady(ready);
      setCheckingSession(false);
      setMessage(ready
        ? "Enter and confirm your new password."
        : "This recovery link is invalid or has expired. Request a new one from the sign-in page.");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || !session) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setRecoveryReady(true);
        setCheckingSession(false);
        setMessage("Enter and confirm your new password.");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword() {
    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setMessage("Password must contain at least one letter and one number.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("Updating your password...");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/account?password=updated");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.icon}>{recoveryReady ? <KeyRound size={26} /> : <LockKeyhole size={26} />}</span>
        <p className={styles.eyebrow}>Secure account recovery</p>
        <h1>Reset your password</h1>
        <p className={styles.intro}>Choose a unique password for your Pixores web and desktop account.</p>

        {recoveryReady ? (
          <form onSubmit={(event) => { event.preventDefault(); void updatePassword(); }}>
            <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters or more" /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></label>
            <button type="submit" disabled={loading}>{loading ? "Updating..." : <><CheckCircle2 size={18} /> Update Password</>}</button>
          </form>
        ) : !checkingSession ? (
          <Link className={styles.returnLink} href="/account">Return to sign in</Link>
        ) : null}

        <p className={styles.message} role="status" aria-live="polite">{message}</p>
      </section>
    </main>
  );
}
