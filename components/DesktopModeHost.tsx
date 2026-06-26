"use client";

import { useEffect, useState } from "react";

export function isPixoresDesktopMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("desktop") === "1";
}

export default function DesktopModeHost() {
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  useEffect(() => {
    const syncDesktopMode = () => {
      const nextDesktopMode = isPixoresDesktopMode();
      setIsDesktopMode(nextDesktopMode);
      document.body.classList.toggle("pixores-desktop-mode", nextDesktopMode);
    };

    syncDesktopMode();
    window.addEventListener("popstate", syncDesktopMode);

    return () => {
      window.removeEventListener("popstate", syncDesktopMode);
      document.body.classList.remove("pixores-desktop-mode");
    };
  }, []);

  return <meta data-pixores-desktop-mode={isDesktopMode ? "1" : "0"} />;
}
