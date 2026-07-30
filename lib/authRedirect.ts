const DEFAULT_PIXORES_SITE_URL = "https://www.pixores.com";

export function getPixoresSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_PIXORES_SITE_URL).replace(/\/$/, "");
}

export function getAuthRedirectUrl(path: `/${string}`) {
  return `${getPixoresSiteUrl()}${path}`;
}
