import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Round Profile Picture Cropper — Free PNG | Pixores",
  description: "Crop a photo into a circular profile picture, adjust its position, and download a transparent PNG. Image processing stays in your browser.",
  path: "/round-profile-picture",
  keywords: ["round profile picture", "circle profile picture cropper", "circular photo crop"],
});

export default function RoundProfilePictureLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
