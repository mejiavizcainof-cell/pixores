const DEFAULT_PIXORES_SITE_URL = "https://www.pixores.com";
const LOCAL_AUTH_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeSiteUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_PIXORES_SITE_URL;

  try {
    const url = new URL(candidate);

    // A public environment variable is frozen into the client bundle at build
    // time. Never let a production build ship a local authentication callback.
    if (process.env.NODE_ENV === "production" && LOCAL_AUTH_HOSTS.has(url.hostname)) {
      return DEFAULT_PIXORES_SITE_URL;
    }

    return url.origin;
  } catch {
    return DEFAULT_PIXORES_SITE_URL;
  }
}

export function getPixoresSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function getAuthRedirectUrl(path: `/${string}`) {
  return `${getPixoresSiteUrl()}${path}`;
}
