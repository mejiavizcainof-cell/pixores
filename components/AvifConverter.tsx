"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

type AvifConverterProps = { outputFormat: "jpg" | "png" };

export default function AvifConverter({ outputFormat }: AvifConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const outputLabel = outputFormat.toUpperCase();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const convert = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputFormat", outputFormat);
    await downloadConvertedFile({
      endpoint: "/api/avif-convert",
      formData,
      fallbackFileName: `converted.${outputFormat}`,
      processingMessage: `Converting AVIF to ${outputLabel}`,
      processingHint: "Your image is uploaded to Pixores for conversion.",
    });
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10 md:px-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Convert AVIF to {outputLabel}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-700">Convert a static AVIF image to a {outputLabel} file online. PNG keeps transparency; JPG uses a white background where the source is transparent.</p>
      </header>
      <ImageUploader onChange={handleFileChange} title="Select an AVIF image" accept=".avif,image/avif" formatsLabel="Static AVIF · up to 4 MB" showCamera={false} />
      <button type="button" onClick={convert} disabled={!file} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
        Convert to {outputLabel}
      </button>
      {preview && <section className="space-y-3"><h2 className="text-xl font-semibold text-slate-900">Preview</h2><img src={preview} alt="Selected AVIF preview" className="max-h-[32rem] max-w-full rounded-xl border border-slate-200 object-contain" /></section>}
      <section className="space-y-3 leading-7 text-slate-700">
        <h2 className="text-2xl font-bold text-slate-950">AVIF conversion notes</h2>
        <p>This tool converts one static AVIF image at a time, up to 4 MB. The image is uploaded to Pixores for processing. Animated AVIF files are not supported.</p>
        {outputFormat === "jpg" && <p>JPG does not support transparency. Transparent areas are filled with white in the converted file.</p>}
        <p>{outputFormat === "jpg" ? <>Need transparency? <Link className="font-semibold text-blue-700 underline" href="/avif-to-png">Convert AVIF to PNG</Link>.</> : <>Need a smaller, widely compatible file? <Link className="font-semibold text-blue-700 underline" href="/avif-to-jpg">Convert AVIF to JPG</Link>.</>}</p>
      </section>
    </main>
  );
}
