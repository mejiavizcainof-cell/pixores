import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Learn how Pixores uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px",
        lineHeight: "1.8",
      }}
    >
      <h1>Cookie Policy</h1>

      <p>
        This Cookie Policy explains how Pixores uses cookies
        and similar technologies when you visit our website.
      </p>

      <h2>What Are Cookies?</h2>

      <p>
        Cookies are small text files stored on your device
        when you visit a website. They help websites function
        properly, improve user experience, and provide
        analytics information.
      </p>

      <h2>How We Use Cookies</h2>

      <p>
        Pixores may use cookies to:
      </p>

      <ul>
        <li>Ensure the website functions correctly.</li>
        <li>Remember user preferences.</li>
        <li>Analyze website traffic and usage.</li>
        <li>Improve performance and user experience.</li>
        <li>Support advertising services when applicable.</li>
      </ul>

      <h2>Third-Party Cookies</h2>

      <p>
        We may use third-party services such as Google
        Analytics and Google AdSense. These services may
        place cookies on your device and collect information
        according to their own privacy policies.
      </p>

      <h2>Managing Cookies</h2>

      <p>
        Most web browsers allow you to control or disable
        cookies through browser settings. Please note that
        disabling cookies may affect certain website
        functionality.
      </p>

      <h2>Changes to This Policy</h2>

      <p>
        We may update this Cookie Policy from time to time.
        Changes will be posted on this page with an updated
        effective date.
      </p>

      <h2>Contact</h2>

      <p>
        If you have questions about this Cookie Policy,
        please contact us at:
      </p>

      <p>
        support@pixores.com
      </p>

      <p>
        Effective Date: June 2026
      </p>
    </main>
  );
}