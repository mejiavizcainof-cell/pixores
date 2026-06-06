import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Pixores",
  description:
    "Learn how Pixores collects, uses and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px",
      }}
    >
      <h1>Privacy Policy</h1>

      <p>
        At Pixores, we respect your privacy and are committed
        to protecting your personal information. Files uploaded
        to our tools are processed only for the time necessary
        to complete the requested conversion or optimization.
      </p>

      <h2>Information We Collect</h2>

      <p>
        We may collect technical information such as IP address,
        browser type, device information and usage statistics
        to improve our services and user experience.
      </p>

      <h2>File Processing</h2>

      <p>
        Uploaded files are processed automatically and are not
        permanently stored on our servers. Files are deleted
        after processing whenever possible.
      </p>

      <h2>Cookies</h2>

      <p>
        This website may use cookies and similar technologies
        to enhance user experience, analyze traffic and support
        advertising services.
      </p>

      <h2>Third-Party Services</h2>

      <p>
        We may use third-party services such as Google Analytics,
        Google AdSense and other analytics providers. These
        services may collect information according to their own
        privacy policies.
      </p>

      <h2>Data Security</h2>

      <p>
        We take reasonable measures to protect information
        processed through our services. However, no method of
        transmission over the Internet is completely secure.
      </p>

      <h2>Changes to This Policy</h2>

      <p>
        We may update this Privacy Policy from time to time.
        Changes will be posted on this page with an updated
        effective date.
      </p>

      <h2>Contact Us</h2>

      <p>
        If you have questions regarding this Privacy Policy,
        please contact us at:
      </p>

      <p>
       support@pixores.com
      </p>
    </main>
  );
}