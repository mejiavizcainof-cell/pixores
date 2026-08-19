import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  Download,
  FileAudio,
  Gauge,
  Layers3,
  Link2,
  LockKeyhole,
  MonitorDown,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import styles from "./AudioStudioLanding.module.css";

const features = [
  { icon: SlidersHorizontal, title: "Convert audio formats", copy: "Create MP3, WAV, M4A, AAC, FLAC, OGG, Opus and AIFF files with bitrate, sample-rate and channel controls." },
  { icon: Link2, title: "Download authorized audio", copy: "Paste individual or multiple supported links, keep every address on its own row and manage concurrent downloads." },
  { icon: Layers3, title: "Batch processing", copy: "Queue several conversions or downloads and continue working while Pixores processes them locally." },
  { icon: Gauge, title: "Professional audio controls", copy: "Normalize loudness, choose stereo or mono output and prepare consistent audio for video projects." },
  { icon: ShieldCheck, title: "Local-first privacy", copy: "Conversions use FFmpeg on your Windows computer. Your local source files are not uploaded to a Pixores server." },
  { icon: FileAudio, title: "Send files to Video Maker", copy: "Preview completed outputs, reveal them in Explorer or transfer them directly into a Pixores video project." },
];

const formats = ["MP3", "WAV", "M4A", "AAC", "FLAC", "OGG", "Opus", "AIFF"];

export default function AudioStudioLanding() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><AudioLines size={17} /> Pixores Audio Studio</p>
          <h1>Convert, organize and download audio from one local workspace.</h1>
          <p className={styles.lead}>Audio Studio is included with Pixores Video Maker Pro for Windows. Process batches locally, manage authorized links and move finished audio directly into your video projects.</p>
          <div className={styles.actions}>
            <Link href="/desktop" className={styles.primary}><MonitorDown size={19} /> Download for Windows</Link>
            <a href="#audio-studio-features" className={styles.secondary}>Explore features <ArrowRight size={17} /></a>
          </div>
          <div className={styles.trustRow}>
            <span><LockKeyhole size={16} /> Local conversion</span>
            <span><Layers3 size={16} /> Batch queues</span>
            <span><ShieldCheck size={16} /> Permission-first downloads</span>
          </div>
        </div>

        <div className={styles.productMockup} aria-label="Preview of the Pixores Audio Studio workspace">
          <div className={styles.mockHeader}><span><i /><i /><i /></span><strong>Pixores Audio Studio</strong></div>
          <div className={styles.mockTabs}><b>Convert</b><span>Download by link</span></div>
          <div className={styles.mockBody}>
            <div className={styles.mockFile}><FileAudio size={19} /><span><strong>podcast-episode.wav</strong><small>Ready to convert</small></span><CheckCircle2 size={17} /></div>
            <div className={styles.mockSettings}><span>MP3</span><span>192 kbps</span><span>48 kHz</span><span>Stereo</span></div>
            <div className={styles.mockProgress}><span /></div>
            <div className={styles.mockFooter}><ShieldCheck size={16} /><span><strong>Processed locally</strong><small>No source upload required</small></span></div>
          </div>
        </div>
      </section>

      <section id="audio-studio-features" className={styles.featureSection}>
        <div className={styles.sectionHeading}><span>Everything in one queue</span><h2>Audio tools built for creator workflows</h2><p>Prepare music, voice, effects and downloaded sounds without switching between unrelated utilities.</p></div>
        <div className={styles.featureGrid}>{features.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className={styles.workflowSection}>
        <div>
          <span className={styles.workflowLabel}>Simple local workflow</span>
          <h2>From source to finished audio in three steps</h2>
        </div>
        <ol>
          <li><span>01</span><div><strong>Add files or authorized links</strong><p>Select several audio files or paste supported links. Each link remains editable on a separate row.</p></div></li>
          <li><span>02</span><div><strong>Choose output settings</strong><p>Select format, bitrate, sample rate, channels, normalization and the output folder.</p></div></li>
          <li><span>03</span><div><strong>Preview or continue editing</strong><p>Open the result in Explorer or send completed audio directly to Pixores Video Maker Pro.</p></div></li>
        </ol>
      </section>

      <section className={styles.formatSection}>
        <div><span>Flexible output</span><h2>Popular audio formats included</h2><p>FFmpeg-powered conversion gives creators practical choices for editing, publishing, archiving and distribution.</p></div>
        <div className={styles.formatGrid}>{formats.map((format) => <span key={format}>{format}</span>)}</div>
      </section>

      <section className={styles.rightsSection}>
        <ShieldCheck size={28} />
        <div><h2>Download responsibly</h2><p>Only download audio you own, are authorized to use or that is offered under a compatible license. Pixores requires confirmation before a download queue starts.</p></div>
      </section>

      <section className={styles.finalCta}>
        <Download size={30} />
        <h2>Get Audio Studio with Pixores Video Maker Pro</h2>
        <p>Available for 64-bit Windows during the Pixores beta.</p>
        <Link href="/desktop" className={styles.primary}>Download Video Maker Pro <ArrowRight size={18} /></Link>
      </section>
    </main>
  );
}
