import type { Metadata } from "next";
import PolicyPage, { type PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of Service | Pixores",
  description: "Read the terms governing the use of Pixores online image tools, Studio, templates, accounts, and AI services.",
  alternates: { canonical: "https://www.pixores.com/terms-of-service" },
};

const sections: PolicySection[] = [
  { id: "agreement", title: "Agreement to These Terms", content: <><p>By accessing or using Pixores, you agree to these Terms of Service. If you do not agree, do not use the services.</p><p>You must be legally able to enter into this agreement or have permission from a parent, guardian, or authorized organization.</p></> },
  { id: "services", title: "Use of the Services", content: <><p>Pixores provides browser-based and server-assisted tools for image conversion, compression, resizing, editing, background removal, upscaling, templates, and related creator workflows.</p><p>Features may change, become temporarily unavailable, or have reasonable limits based on browser, server, provider, or account requirements.</p></> },
  { id: "accounts", title: "Accounts and Credits", content: <><p>You are responsible for activity under your account and for keeping access credentials secure. Provide accurate information and notify us if you believe your account has been compromised.</p><p>Some AI or premium operations may use credits. Pricing, credit usage, and applicable limitations are shown before purchase or use. Except where required by law, consumed credits are not refundable.</p></> },
  { id: "content", title: "Your Files and Content", content: <><p>You retain ownership of files and designs you upload or create. You grant Pixores a limited permission to process that content only as needed to provide, secure, and improve the requested service.</p><p>You must have the necessary rights and permissions for all content you upload, edit, save, publish, or download.</p></> },
  { id: "prohibited", title: "Prohibited Uses", content: <><p>You may not use Pixores to:</p><ul><li>Upload, create, or distribute illegal, harmful, or abusive content.</li><li>Infringe copyrights, trademarks, privacy rights, or other rights.</li><li>Distribute malware or attempt unauthorized access.</li><li>Interfere with service operation or bypass technical limits.</li><li>Use automated activity that creates unreasonable load.</li><li>Engage in fraud, impersonation, or deceptive conduct.</li></ul></> },
  { id: "property", title: "Pixores Intellectual Property", content: <><p>Pixores branding, interface design, software, and original site content are protected by applicable intellectual property laws. These terms do not transfer ownership of Pixores technology or branding to users.</p></> },
  { id: "third-party", title: "Third-Party Services", content: <><p>Pixores may rely on external providers for hosting, authentication, payments, analytics, advertising, and AI processing. Their services may be governed by separate terms and policies.</p></> },
  { id: "disclaimers", title: "Disclaimers", content: <><p>Pixores is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the extent permitted by law, we disclaim warranties regarding uninterrupted availability, fitness for a particular purpose, and error-free results.</p><p>You are responsible for reviewing outputs and keeping backups of important files.</p></> },
  { id: "liability", title: "Limitation of Liability", content: <><p>To the fullest extent permitted by law, Pixores will not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the services, loss of files, or reliance on an output.</p></> },
  { id: "termination", title: "Changes and Termination", content: <><p>We may update these terms, modify services, or restrict access when necessary for security, legal compliance, abuse prevention, or service operation. Updated terms become effective when posted unless otherwise stated.</p></> },
  { id: "contact", title: "Contact", content: <><p>Questions about these terms can be sent to <a href="mailto:support@pixores.com">support@pixores.com</a>.</p></> },
];

export default function TermsOfServicePage() {
  return <PolicyPage title="Terms of Service" description="The rules that apply when you use Pixores tools, accounts, credits, templates, and creator services." lastUpdated="June 21, 2026" notice="Use Pixores lawfully, upload only content you have permission to process, and keep backups of files that matter to you." sections={sections} />;
}
