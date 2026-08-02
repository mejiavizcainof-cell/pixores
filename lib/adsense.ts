function normalizePublisherId(value: string | undefined) {
  const trimmed = value?.trim();

  if (trimmed?.match(/^pub-\d{16}$/)) return trimmed;
  if (trimmed?.match(/^ca-pub-\d{16}$/)) return trimmed.slice(3);

  return undefined;
}

const PIXORES_ADSENSE_PUBLISHER_ID = "pub-5356041265648397";

export const googleAdSensePublisherId = normalizePublisherId(
  process.env.GOOGLE_ADSENSE_PUBLISHER_ID ?? PIXORES_ADSENSE_PUBLISHER_ID,
);

export const googleAdSenseClientId = googleAdSensePublisherId
  ? `ca-${googleAdSensePublisherId}`
  : undefined;

export const googleAdSenseEnabled =
  Boolean(googleAdSenseClientId) &&
  process.env.GOOGLE_ADSENSE_ENABLED !== "false";
