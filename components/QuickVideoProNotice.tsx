"use client";

import Link from "next/link";
import { MonitorDown, Sparkles, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import styles from "./QuickVideoProNotice.module.css";

const SESSION_DISMISS_KEY = "pixores-quick-video-pro-notice-dismissed";
const DISMISS_EVENT = "pixores:quick-video-pro-notice-change";

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(DISMISS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getDismissedSnapshot() {
  return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
}

function getServerDismissedSnapshot() {
  return false;
}

export default function QuickVideoProNotice() {
  const isDismissed = useSyncExternalStore(
    subscribe,
    getDismissedSnapshot,
    getServerDismissedSnapshot,
  );

  function dismiss() {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  if (isDismissed) return null;

  return (
    <aside className={styles.notice} role="dialog" aria-label="Pixores Video Maker Pro recommendation" aria-live="polite">
      <button type="button" className={styles.closeButton} onClick={dismiss} aria-label="Close recommendation">
        <X size={17} />
      </button>
      <div className={styles.icon} aria-hidden="true"><Sparkles size={20} /></div>
      <div className={styles.copy}>
        <span>FREE DESKTOP EDITOR</span>
        <strong>Working on a longer video?</strong>
        <p>For Pro tools and faster local GPU rendering, use Pixores Video Maker Pro. It is still free for Windows.</p>
      </div>
      <Link className={styles.downloadButton} href="/desktop" onClick={dismiss}>
        <MonitorDown size={17} />
        Download Pro free
      </Link>
    </aside>
  );
}
