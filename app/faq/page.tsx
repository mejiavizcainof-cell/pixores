import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Pixores image tools.",
};

export default function FAQPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px",
        lineHeight: "1.8",
      }}
    >
      <h1>Frequently Asked Questions</h1>

      <h2>Is Pixores free?</h2>
      <p>
        Yes. All current Pixores tools are completely free
        to use.
      </p>

      <h2>Do I need to create an account?</h2>
      <p>
        No. You can use our tools without registration.
      </p>

      <h2>Are my files stored?</h2>
      <p>
        No. Files are processed only to perform the
        requested conversion or optimization.
      </p>

      <h2>What image formats are supported?</h2>
      <p>
        Pixores currently supports JPG, PNG, WebP, HEIC
        and PDF-related image tools.
      </p>

      <h2>Can I use Pixores on mobile devices?</h2>
      <p>
        Yes. Pixores works on smartphones, tablets,
        laptops and desktop computers.
      </p>

      <h2>Is there a file size limit?</h2>
      <p>
        File size limits may vary depending on the tool
        and server resources available.
      </p>

      <h2>Do you support batch processing?</h2>
      <p>
        Not yet. Batch conversion may be added in future
        updates.
      </p>

      <h2>How secure is Pixores?</h2>
      <p>
        We take security seriously and process files only
        for the requested operation.
      </p>

      <h2>How can I contact Pixores?</h2>
      <p>
        You can contact us at:
        <br />
        <strong>support@pixores.com</strong>
      </p>
    </main>
  );
}