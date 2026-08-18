import { createClient } from "@supabase/supabase-js";
import { getPixoresDesktopBridge } from "@/src/video-maker/adapters/runtime";

const desktopBridge = getPixoresDesktopBridge();

function readBrowserStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeBrowserStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // A failed legacy cleanup must not prevent the encrypted store from loading.
  }
}

const desktopAuthStorage = desktopBridge?.getAuthStorageItem ? {
  async getItem(key: string) {
    try {
      const storedValue = await desktopBridge.getAuthStorageItem?.(key);
      if (storedValue) return storedValue;

      // Migrate a session created by an earlier desktop beta on this origin.
      const legacyValue = readBrowserStorage(key);
      if (legacyValue) {
        await desktopBridge.setAuthStorageItem?.(key, legacyValue);
        removeBrowserStorage(key);
      }
      return legacyValue;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    await desktopBridge.setAuthStorageItem?.(key, value);
    removeBrowserStorage(key);
  },
  async removeItem(key: string) {
    removeBrowserStorage(key);
    await desktopBridge.removeAuthStorageItem?.(key);
  },
} : undefined;

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  desktopAuthStorage ? {
    auth: {
      storage: desktopAuthStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  } : undefined,
);
