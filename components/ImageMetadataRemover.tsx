"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

export default function ImageMetadataRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const removeMetadata = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await downloadConvertedFile({
      endpoint: "/api/remove-image-metadata",
      formData,
      fallbackFileName: "metadata-removed-image",
      processingMessage: "Removing image metadata",
      processingHint: "Your image is uploaded to Pixores for processing.",
    });
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10 md:px-10">
      <header className="space-y-3"><h1 className="text-4xl font-bold tracking-tight text-slate-950">Remove Photo Metadata</h1><p className="max-w-3xl text-lg leading-8 text-slate-700">Create a copy of a JPG, PNG or WebP image without embedded metadata such as camera details or location tags.</p></header>
      <ImageUploader onChange={handleFileChange} title="Select an image" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" formatsLabel="JPG, PNG or WebP · up to 4 MB" showCamera={false} />
      <button type="button" onClick={removeMetadata} disabled={!file} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Create metadata-free copy</button>
      <p className="text-sm leading-6 text-slate-600">The image is uploaded to Pixores and re-encoded in its original format. Re-encoding may slightly change JPG or WebP compression. The converted copy is returned to your device.</p>
      {preview && <section className="space-y-3"><h2 className="text-xl font-semibold text-slate-900">Preview</h2><img src={preview} alt="Selected image preview" className="max-h-[32rem] max-w-full rounded-xl border border-slate-200 object-contain" /></section>}
      <section className="space-y-3 leading-7 text-slate-700"><h2 className="text-2xl font-bold text-slate-950">What metadata removal does</h2><p>Pixores creates a new image file and removes embedded metadata during re-encoding. Keep the original if you need its capture details. Do not upload sensitive images if server processing is not appropriate for them.</p></section>
    </main>
  );
}
