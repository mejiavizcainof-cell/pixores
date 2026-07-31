import { PIXORES_SYSTEM_FONT_NAMES } from "./pixores-fonts";
import { getPixoresTextFontWeight } from "./pixores-text-style";

export const PIXORES_LOCAL_FONT_STYLESHEET = "/video-maker-assets/fonts/pixores-fonts.css";
const stylesheetId = "pixores-local-fonts";
const stylesheetPromises = new Map<string, Promise<void>>();

export function ensurePixoresFontStylesheetLoaded(stylesheetUrl = PIXORES_LOCAL_FONT_STYLESHEET) {
  if (typeof document === "undefined") return Promise.resolve();
  const existingPromise = stylesheetPromises.get(stylesheetUrl);
  if (existingPromise) return existingPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const linkId = `${stylesheetId}-${Math.abs([...stylesheetUrl].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0, 0))}`;
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;
    const link = existing || document.createElement("link");
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error("Pixores local font stylesheet could not be loaded.")), { once: true });
    if (!existing) {
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = stylesheetUrl;
      document.head.appendChild(link);
    } else if (link.sheet) {
      resolve();
    }
  }).catch((error) => {
    stylesheetPromises.delete(stylesheetUrl);
    throw error;
  });
  stylesheetPromises.set(stylesheetUrl, promise);
  return promise;
}

export async function ensurePixoresFontLoaded(fontFamily?: string, isBold?: boolean, stylesheetUrl = PIXORES_LOCAL_FONT_STYLESHEET) {
  if (!fontFamily || typeof document === "undefined") return;
  if (!PIXORES_SYSTEM_FONT_NAMES.has(fontFamily)) await ensurePixoresFontStylesheetLoaded(stylesheetUrl);
  await document.fonts.load(`${getPixoresTextFontWeight(isBold)} 64px "${fontFamily.replaceAll('"', "")}"`);
}

export async function ensurePixoresFontsLoaded(fontFamilies: Iterable<string>, stylesheetUrl = PIXORES_LOCAL_FONT_STYLESHEET) {
  const uniqueFamilies = [...new Set(fontFamilies)].filter(Boolean);
  await Promise.all(uniqueFamilies.map((fontFamily) => ensurePixoresFontLoaded(fontFamily, undefined, stylesheetUrl)));
  if (typeof document !== "undefined") await document.fonts.ready;
}
