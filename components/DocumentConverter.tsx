"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Download, FileText, Lock, Upload, X } from "lucide-react";
import styles from "./DocumentConverter.module.css";

type Direction = "word-to-pdf" | "pdf-to-word";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "pixores-document";
}

export default function DocumentConverter() {
  const [direction, setDirection] = useState<Direction>("word-to-pdf");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = direction === "word-to-pdf" ? ".docx" : ".pdf";

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase();
    const expected = direction === "word-to-pdf" ? "docx" : "pdf";
    if (extension !== expected) {
      setError(`Please select a .${expected} file.`);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("The file is larger than 25 MB.");
      return;
    }
    setFile(candidate);
    setError("");
    setProgress(0);
  };

  const changeDirection = (next: Direction) => {
    if (busy) return;
    setDirection(next);
    setFile(null);
    setError("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const wordToPdf = async (source: File) => {
    setProgress(18);
    const mammoth = await import("mammoth");
    const { jsPDF } = await import("jspdf");
    const arrayBuffer = await source.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => ({
          src: `data:${image.contentType};base64,${await image.read("base64")}`,
        })),
      },
    );
    setProgress(48);

    const printable = document.createElement("article");
    printable.className = styles.printableDocument;
    printable.innerHTML = result.value;
    printable.setAttribute("aria-hidden", "true");
    document.body.appendChild(printable);

    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      await new Promise<void>((resolve) => {
        void pdf.html(printable, {
          callback: () => resolve(),
          x: 52,
          y: 52,
          width: 491,
          windowWidth: 780,
          autoPaging: "text",
          html2canvas: { scale: 0.92, useCORS: true, backgroundColor: "#ffffff" },
        });
      });
      setProgress(92);
      downloadBlob(pdf.output("blob"), `${baseName(source.name)}.pdf`);
    } finally {
      printable.remove();
    }
  };

  const pdfToWord = async (source: File) => {
    setProgress(12);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const bytes = new Uint8Array(await source.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const children: InstanceType<typeof Paragraph>[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows = new Map<number, { x: number; text: string }[]>();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const row = rows.get(y) || [];
        row.push({ x: item.transform[4], text: item.str });
        rows.set(y, row);
      }

      if (pageNumber > 1) children.push(new Paragraph({ pageBreakBefore: true }));
      children.push(new Paragraph({ text: `Page ${pageNumber}`, heading: HeadingLevel.HEADING_2 }));
      [...rows.entries()]
        .sort(([a], [b]) => b - a)
        .forEach(([, row]) => {
          const text = row.sort((a, b) => a.x - b.x).map((part) => part.text).join(" ").replace(/\s+/g, " ").trim();
          if (text) children.push(new Paragraph({ children: [new TextRun(text)], spacing: { after: 100 } }));
        });
      setProgress(20 + Math.round((pageNumber / pdf.numPages) * 65));
    }

    const documentFile = new Document({
      creator: "Pixores Document Converter",
      title: baseName(source.name),
      sections: [{ properties: {}, children }],
    });
    const blob = await Packer.toBlob(documentFile);
    setProgress(94);
    downloadBlob(blob, `${baseName(source.name)}.docx`);
  };

  const convert = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setProgress(4);
    try {
      if (direction === "word-to-pdf") await wordToPdf(file);
      else await pdfToWord(file);
      setProgress(100);
    } catch (conversionError) {
      console.error(conversionError);
      setError("We could not convert this file. Password-protected or highly complex documents may not be supported yet.");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}><FileText size={17} /> Pixores Documents</span>
        <h1>Word & PDF Converter</h1>
        <p>Convert DOCX to PDF or turn a PDF into an editable Word document. Your file stays in your browser.</p>
      </section>

      <section className={styles.converter}>
        <div className={styles.tabs} role="tablist" aria-label="Conversion direction">
          <button type="button" role="tab" aria-selected={direction === "word-to-pdf"} className={direction === "word-to-pdf" ? styles.activeTab : ""} onClick={() => changeDirection("word-to-pdf")}>Word to PDF</button>
          <button type="button" className={styles.swapButton} aria-label="Switch conversion direction" onClick={() => changeDirection(direction === "word-to-pdf" ? "pdf-to-word" : "word-to-pdf")}><ArrowLeftRight size={18} /></button>
          <button type="button" role="tab" aria-selected={direction === "pdf-to-word"} className={direction === "pdf-to-word" ? styles.activeTab : ""} onClick={() => changeDirection("pdf-to-word")}>PDF to Word</button>
        </div>

        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
        >
          <input ref={inputRef} type="file" accept={accept} onChange={(event) => chooseFile(event.target.files?.[0])} hidden />
          {!file ? (
            <>
              <span className={styles.uploadIcon}><Upload size={28} /></span>
              <h2>Drop your {direction === "word-to-pdf" ? "Word" : "PDF"} file here</h2>
              <p>or choose a file from your device · maximum 25 MB</p>
              <button type="button" onClick={() => inputRef.current?.click()}>Choose {direction === "word-to-pdf" ? "DOCX" : "PDF"}</button>
            </>
          ) : (
            <div className={styles.fileReady}>
              <span className={styles.fileIcon}><FileText size={30} /></span>
              <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to convert</small></div>
              <button type="button" disabled={busy} className={styles.removeButton} onClick={() => { setFile(null); setProgress(0); }} aria-label="Remove selected file"><X size={19} /></button>
            </div>
          )}
        </div>

        {progress > 0 && <div className={styles.progressWrap}><div className={styles.progressMeta}><span>{progress === 100 ? <><CheckCircle2 size={15} /> Download started</> : "Converting locally…"}</span><strong>{progress}%</strong></div><div className={styles.progress}><span style={{ width: `${progress}%` }} /></div></div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="button" className={styles.convertButton} disabled={!file || busy} onClick={() => void convert()}><Download size={19} /> {busy ? "Converting…" : `Convert to ${direction === "word-to-pdf" ? "PDF" : "Word"}`}</button>
        <p className={styles.privacy}><Lock size={14} /> Private by design: processing happens on this device and files are not uploaded.</p>
      </section>

      <section className={styles.infoGrid}>
        <article><strong>Editable output</strong><p>PDF text is rebuilt as an editable DOCX document, organized page by page.</p></article>
        <article><strong>Modern DOCX support</strong><p>Convert Word documents with headings, lists, tables, and images into PDF.</p></article>
        <article><strong>No account required</strong><p>Open the tool, select a document, convert, and download immediately.</p></article>
      </section>
    </div>
  );
}
