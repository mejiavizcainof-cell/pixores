import type { Metadata } from "next";
import VideoMaker from "@/components/VideoMaker";
import DesktopAuthGate from "@/components/DesktopAuthGate";
import QuickVideoProNotice from "@/components/QuickVideoProNotice";
import ToolSeo from "@/components/ToolSeo";

export const metadata: Metadata = {
  title: "Pixores Quick Video Maker",
  description:
    "Create and edit videos online with Pixores Video Maker. Use the professional timeline, text styles, transitions, audio tools, Smart Clips and browser export.",
  alternates: { canonical: "https://www.pixores.com/video-maker" },
  keywords: [
    "video maker",
    "free video maker",
    "social video maker",
    "online video editor",
    "youtube video maker",
    "short video maker",
    "Pixores Video Maker",
  ],
};

type VideoMakerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VideoMakerPage({ searchParams }: VideoMakerPageProps) {
  const values = await searchParams;
  const isDesktopMode = values.desktop === "1";

  return (
    <>
      <DesktopAuthGate required experience={isDesktopMode ? "desktop" : "online"} showAccountDock={false}>
        {!isDesktopMode && <QuickVideoProNotice />}
        <VideoMaker />
      </DesktopAuthGate>
      {!isDesktopMode && (
        <ToolSeo
          tool="video-maker"
          title="How to Prepare and Verify a Browser Video Project"
          description="Choose the delivery format, organize source media, build a timeline, review audio and captions, and play the complete exported file before publishing."
        />
      )}
    </>
  );
}
