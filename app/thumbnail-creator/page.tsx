import { permanentRedirect } from "next/navigation";

type LegacyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyThumbnailCreatorPage({ searchParams }: LegacyPageProps) {
  const values = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }

  const suffix = query.size ? `?${query.toString()}` : "";
  permanentRedirect(`/youtube-thumbnail-maker${suffix}`);
}
