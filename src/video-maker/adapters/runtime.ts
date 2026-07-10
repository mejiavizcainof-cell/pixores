import type { PixoresDesktopBridge } from "./types";

/**
 * Runtime detection for Pixores Video Maker.
 *
 * The normal web app never defines `window.pixoresDesktop`; Electron exposes it
 * through preload when the editor runs in desktop mode.
 */

export function isPixoresDesktop() {
  return typeof window !== "undefined" && Boolean((window as Window & { pixoresDesktop?: unknown }).pixoresDesktop);
}

export function getPixoresDesktopBridge() {
  return typeof window !== "undefined"
    ? (window as Window & { pixoresDesktop?: PixoresDesktopBridge }).pixoresDesktop
    : undefined;
}
