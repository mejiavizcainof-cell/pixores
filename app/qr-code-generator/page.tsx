"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const MAX_TEXT_LENGTH = 2000;

export default function QrCodeGeneratorPage() {
  const [value, setValue] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    const content = value.trim();
    setError("");
    if (!content) {
      setImageUrl("");
      return () => { current = false; };
    }
    if (content.length > MAX_TEXT_LENGTH) {
      setImageUrl("");
      setError(`Keep the text under ${MAX_TEXT_LENGTH} characters.`);
      return () => { current = false; };
    }
    QRCode.toDataURL(content, { errorCorrectionLevel: "M", margin: 2, width: 800 })
      .then((url) => { if (current) setImageUrl(url); })
      .catch(() => { if (current) { setImageUrl(""); setError("This text is too long to create a QR code."); } });
    return () => { current = false; };
  }, [value]);

  const downloadPng = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "pixores-qr-code.png";
    link.click();
  };

  return (
    <main className="mx-auto max-w-4xl space-y-7 px-5 py-10 md:px-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Free Pixores tool</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Free QR Code Generator</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-700">Create a QR code from a URL or short text and download it as a PNG. Your text is processed in this page and is not uploaded to Pixores.</p>
      </header>

      <section className="grid gap-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_280px] md:p-7">
        <div className="space-y-4">
          <label htmlFor="qr-content" className="block space-y-2 font-semibold text-slate-900">
            <span>Website URL or text</span>
            <textarea id="qr-content" value={value} maxLength={MAX_TEXT_LENGTH + 1} onChange={(event) => setValue(event.target.value)} rows={5} placeholder="https://example.com" className="block w-full rounded-xl border border-slate-300 p-3 font-normal" />
          </label>
          <p className="text-sm text-slate-600">{value.length}/{MAX_TEXT_LENGTH} characters · Static QR code · PNG download</p>
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <button type="button" onClick={downloadPng} disabled={!imageUrl} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Download QR code PNG</button>
        </div>
        <div className="flex min-h-64 items-center justify-center rounded-xl bg-slate-50 p-4">
          {imageUrl ? <img src={imageUrl} alt="Generated QR code preview" className="h-56 w-56" /> : <p className="text-center text-sm text-slate-500">Enter a URL or text to preview your QR code.</p>}
        </div>
      </section>

      <section className="space-y-3 leading-7 text-slate-700">
        <h2 className="text-2xl font-bold text-slate-950">About this QR code</h2>
        <p>This tool creates a static QR code. The encoded content cannot be changed after printing; create a new code if the destination changes. Test the downloaded image with a phone before sharing or printing it.</p>
      </section>
    </main>
  );
}
