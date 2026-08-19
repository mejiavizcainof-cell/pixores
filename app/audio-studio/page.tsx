import type { Metadata } from "next";
import AudioStudio from "@/components/AudioStudio";
import DesktopAuthGate from "@/components/DesktopAuthGate";

export const metadata: Metadata = {
  title: "Audio Studio – Local Audio Converter for Windows",
  description: "Convert audio formats in batches, download authorized audio links concurrently and send finished files to Pixores Video Maker Pro.",
  alternates: { canonical: "https://www.pixores.com/audio-studio" },
  openGraph: {
    title: "Pixores Audio Studio",
    description: "Local audio conversion, concurrent authorized downloads and creator-ready batch queues for Windows.",
    url: "https://www.pixores.com/audio-studio",
    siteName: "Pixores",
    type: "website",
  },
};

export default function AudioStudioPage() {
  return (
    <DesktopAuthGate required={false} experience="desktop">
      <AudioStudio />
    </DesktopAuthGate>
  );
}
