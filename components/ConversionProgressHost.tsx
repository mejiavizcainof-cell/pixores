"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";

type ProgressState = {
  visible: boolean;
  progress: number;
  status: string;
  fileName: string;
  hint?: string;
  error?: string;
  complete?: boolean;
};

export const CONVERSION_EVENT = "pixores:conversion-progress";

export default function ConversionProgressHost() {
  const [state, setState] = useState<ProgressState>({ visible: false, progress: 0, status: "", fileName: "" });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stopTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { phase: string; fileName?: string; error?: string; status?: string; hint?: string };

      if (detail.phase === "start") {
        stopTimer();
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setState({
          visible: true,
          progress: 8,
          status: detail.status || "Uploading and converting...",
          fileName: detail.fileName || "Your image",
          hint: detail.hint,
        });
        timerRef.current = setInterval(() => {
          setState((current) => ({ ...current, progress: Math.min(82, current.progress + Math.max(1, Math.round((82 - current.progress) / 7))) }));
        }, 420);
        return;
      }

      if (detail.phase === "preparing") {
        stopTimer();
        setState((current) => ({ ...current, progress: 92, status: "Preparing your download..." }));
        return;
      }

      if (detail.phase === "complete") {
        stopTimer();
        setState((current) => ({ ...current, progress: 100, status: "Download started", complete: true }));
        closeTimerRef.current = setTimeout(() => setState((current) => ({ ...current, visible: false })), 1400);
        return;
      }

      if (detail.phase === "error") {
        stopTimer();
        setState((current) => ({ ...current, progress: 100, status: "Conversion failed", error: detail.error || "Please try again." }));
      }
    };

    window.addEventListener(CONVERSION_EVENT, handleProgress);
    return () => {
      stopTimer();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      window.removeEventListener(CONVERSION_EVENT, handleProgress);
    };
  }, []);

  if (!state.visible) return null;

  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15, 23, 42, 0.62)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: "520px", padding: "28px", borderRadius: "8px", background: "#FFFFFF", boxShadow: "0 24px 70px rgba(15,23,42,0.28)", textAlign: "center", position: "relative" }}>
        {state.error && (
          <button type="button" aria-label="Close" onClick={() => setState((current) => ({ ...current, visible: false }))} style={{ position: "absolute", right: "12px", top: "12px", width: "38px", height: "38px", display: "grid", placeItems: "center", border: "1px solid #E2E8F0", borderRadius: "8px", background: "#FFFFFF", cursor: "pointer" }}>
            <X size={20} />
          </button>
        )}

        {state.complete ? <CheckCircle2 size={52} color="#10B981" style={{ margin: "0 auto 16px" }} /> : <LoaderCircle size={52} color={state.error ? "#DC2626" : "#2563EB"} style={{ margin: "0 auto 16px", animation: state.error ? "none" : "pixores-progress-spin 1s linear infinite" }} />}
        <h2 style={{ margin: "0 0 8px", color: "#0F172A", fontSize: "26px" }}>{state.status}</h2>
        <p style={{ margin: "0 0 22px", color: "#64748B", overflowWrap: "anywhere" }}>{state.fileName}</p>
        {state.hint && !state.error && !state.complete && (
          <p style={{ margin: "-10px 0 20px", color: "#475569", fontSize: "14px" }}>{state.hint}</p>
        )}

        {!state.error && (
          <>
            <div style={{ height: "12px", overflow: "hidden", borderRadius: "999px", background: "#E2E8F0" }}>
              <div style={{ width: `${state.progress}%`, height: "100%", borderRadius: "inherit", background: state.complete ? "#10B981" : "#2563EB", transition: "width 280ms ease" }} />
            </div>
            <strong style={{ display: "block", marginTop: "12px", color: "#0F172A", fontSize: "22px" }}>
              {state.progress >= 82 && !state.complete ? "AI processing..." : `${state.progress}%`}
            </strong>
          </>
        )}

        {state.error && <p style={{ margin: "16px 0 0", color: "#DC2626", fontWeight: 700 }}>{state.error}</p>}
        <style>{`@keyframes pixores-progress-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
