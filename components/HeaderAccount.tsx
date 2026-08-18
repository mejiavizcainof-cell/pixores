"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./HeaderAccount.module.css";

export default function HeaderAccount() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setEmail(data.session?.user.email || null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user.email || null);
      setReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);

    if (!error) setEmail(null);
  }

  if (!ready) {
    return <span className={styles.loading} aria-label="Checking account session">Account</span>;
  }

  if (!email) {
    return <Link href="/account" className={styles.signIn}>Sign in</Link>;
  }

  return (
    <div className={styles.controls}>
      <Link href="/account" className={styles.identity} title={email} aria-label={`Account signed in as ${email}`}>
        <UserRound size={16} aria-hidden="true" />
        <span className={styles.email}>{email}</span>
      </Link>
      <button
        type="button"
        className={styles.signOut}
        onClick={() => void signOut()}
        disabled={signingOut}
        aria-label="Log out of Pixores"
      >
        <LogOut size={16} aria-hidden="true" />
        <span className={styles.signOutText}>{signingOut ? "Logging out..." : "Log out"}</span>
      </button>
    </div>
  );
}
