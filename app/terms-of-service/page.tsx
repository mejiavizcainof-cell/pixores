import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Pixores",
  description:
    "Terms and conditions governing the use of Pixores online tools and services.",
};

export default function TermsOfServicePage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px",
        lineHeight: "1.8",
      }}
    >
      <h1>Terms of Service</h1>

      <p>
        Welcome to Pixores. By accessing or using our
        website and online tools, you agree to comply
        with these Terms of Service.
      </p>

      <h2>Use of the Services</h2>

      <p>
        Pixores provides free online tools for image
        conversion, compression, resizing and related
        file processing services.
      </p>

      <p>
        You agree to use our services only for lawful
        purposes and in compliance with all applicable
        laws and regulations.
      </p>

      <h2>User Content</h2>

      <p>
        You retain ownership of any files you upload.
        By using our services, you grant Pixores
        permission to process your files solely for
        the purpose of providing the requested service.
      </p>

      <p>
        Uploaded files are not permanently stored and
        may be automatically deleted after processing.
      </p>

      <h2>Prohibited Uses</h2>

      <p>You may not use Pixores to:</p>

      <ul>
        <li>Upload illegal or harmful content.</li>
        <li>Distribute malware or malicious files.</li>
        <li>Attempt to disrupt or damage our services.</li>
        <li>Violate intellectual property rights.</li>
        <li>Engage in fraudulent or abusive activities.</li>
      </ul>

      <h2>Intellectual Property</h2>

      <p>
        The Pixores website, branding, design and
        software are protected by applicable
        intellectual property laws.
      </p>

      <p>
        You may not copy, reproduce or redistribute
        our content without prior written permission.
      </p>

      <h2>Disclaimer of Warranties</h2>

      <p>
        Pixores is provided on an "as is" and
        "as available" basis. We make no warranties
        regarding availability, accuracy or reliability
        of the services.
      </p>

      <h2>Limitation of Liability</h2>

      <p>
        To the fullest extent permitted by law,
        Pixores shall not be liable for any indirect,
        incidental, special or consequential damages
        resulting from the use of our services.
      </p>

      <h2>Third-Party Services</h2>

      <p>
        Our website may integrate third-party services
        such as analytics, advertising and hosting
        providers. These services operate under their
        own terms and privacy policies.
      </p>

      <h2>Changes to These Terms</h2>

      <p>
        We reserve the right to update these Terms of
        Service at any time. Changes will become
        effective upon publication on this page.
      </p>

      <h2>Termination</h2>

      <p>
        We reserve the right to restrict or terminate
        access to our services if these terms are
        violated.
      </p>

      <h2>Contact Us</h2>

      <p>
        If you have questions regarding these Terms of
        Service, please contact us at:
      </p>

      <p>
        support@pixores.com
      </p>

      <p>
        Last updated: June 2026
      </p>
    </main>
  );
}