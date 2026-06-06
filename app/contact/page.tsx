import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Pixores",
  description:
    "Get in touch with the Pixores team for questions, feedback or support.",
};

export default function ContactPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px",
        lineHeight: "1.8",
      }}
    >
      <h1>Contact Us</h1>

      <p>
        If you have questions, suggestions, bug reports
        or need assistance using our tools, we'd love
        to hear from you.
      </p>

      <p>
        Our team is committed to improving Pixores and
        providing the best possible experience for our
        users.
      </p>

      <h2>Email Support</h2>

      <p>
        For support inquiries, please contact us at:
      </p>

      <p>
        <strong>support@pixores.com</strong>
      </p>

      <h2>Feedback</h2>

      <p>
        We welcome feedback, feature requests and ideas
        for new tools that can help creators, developers
        and businesses work more efficiently with images
        and files.
      </p>
    </main>
  );
}