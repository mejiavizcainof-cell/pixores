"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_PAGES = 500;

export default function PdfMerger() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const additions = Array.from(selected).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    const next = [...files, ...additions];
    if (additions.length !== selected.length) setError("Only PDF files can be added.");
    else setError("");
    if (next.length > MAX_FILES) {
      setError(`Choose up to ${MAX_FILES} PDF files.`);
      return;
    }
    if (next.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
      setError("The combined files must be 50 MB or smaller.");
      return;
    }
    setFiles(next);
    setMessage("");
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const merge = async () => {
    if (files.length < 2) {
      setError("Add at least two PDF files to merge.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Merging PDFs in your browser…");
    try {
      const merged = await PDFDocument.create();
      let totalPages = 0;
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        totalPages += source.getPageCount();
        if (totalPages > MAX_TOTAL_PAGES) throw new Error("The combined PDF cannot exceed 500 pages.");
        const pages = await merged.copyPages(source, source.getPageIndices());
        for (const page of pages) merged.addPage(page);
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Merged ${files.length} PDFs (${totalPages} pages). The combined PDF was downloaded.`);
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes("500 pages") ? cause.message : "A PDF could not be read. Check that it is not password-protected or damaged.");
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-7 px-5 py-10 md:px-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Free Pixores tool</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Merge PDF Files</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-700">Combine several PDF files into one document, choose their order, and download the result.</p>
      </header>
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7" aria-label="Merge PDFs">
        <label htmlFor="pdf-files" className="block space-y-2 font-semibold text-slate-900">
          <span>Add PDF files in the order you want them</span>
          <input id="pdf-files" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => addFiles(event.target.files)} className="block w-full rounded-xl border border-slate-300 p-3 font-normal" />
        </label>
        <p className="text-sm text-slate-600">Up to {MAX_FILES} files, 50 MB combined, and 500 pages. Files are processed locally in your browser and are not uploaded.</p>
        {files.length > 0 && <ol className="space-y-2">
          {files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
            <span className="min-w-0 flex-1 break-all text-sm text-slate-800">{index + 1}. {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
            <button type="button" disabled={index === 0} onClick={() => moveFile(index, -1)} className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-40" aria-label={`Move ${file.name} up`}>↑</button>
            <button type="button" disabled={index === files.length - 1} onClick={() => moveFile(index, 1)} className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-40" aria-label={`Move ${file.name} down`}>↓</button>
            <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded border border-slate-300 px-3 py-1 text-sm text-red-700">Remove</button>
          </li>)}
        </ol>}
        <button type="button" disabled={busy || files.length < 2} onClick={merge} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Merging…" : "Merge and download PDF"}</button>
        {message && <p role="status" className="text-sm font-medium text-green-800">{message}</p>}
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      </section>
      <section className="space-y-3 leading-7 text-slate-700"><h2 className="text-2xl font-bold text-slate-950">Private PDF merging</h2><p>Files are read and combined in your browser. Password-protected PDFs are not supported. This tool merges pages; it does not compress the images inside a PDF.</p></section>
    </main>
  );
}
