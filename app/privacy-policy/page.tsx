import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { type PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Pixores",
  description: "Learn how Pixores collects, uses, processes, and protects information when you use our image tools and services.",
  alternates: { canonical: "https://www.pixores.com/privacy-policy" },
};

const sections: PolicySection[] = [
  { id: "information", title: "Information We Collect", content: <><p>We may collect technical information such as IP address, browser type, device information, referring pages, and usage statistics. This information helps us operate, secure, and improve Pixores.</p><p>If you create an account, we process account details such as your email address and the identifiers needed to provide saved projects or other account features.</p></> },
  { id: "files", title: "File Processing", content: <><p>Files are processed only to provide the tool or operation you request. Browser-based tools may process files locally on your device. Other tools may send files to a secure server or specialized processing provider.</p><p>We do not claim ownership of uploaded files. Files requiring server processing are retained only as long as reasonably necessary to complete the operation, troubleshoot failures, or meet legal obligations.</p></> },
  { id: "accounts", title: "Accounts, Projects, and Payments", content: <><p>Signed-in users may choose to save projects, templates, brand assets, or related information. This content remains associated with the account until it is deleted by the user or removed under our retention practices.</p><p>Payments are processed by third-party payment providers. Pixores does not directly store complete payment card details.</p></> },
  { id: "cookies", title: "Cookies and Advertising", content: <><p>Pixores may use cookies and similar technologies for essential functionality, preferences, analytics, security, and advertising. Advertising partners may use cookies or related identifiers according to their own policies.</p><p>See our <Link href="/cookie-policy">Cookie Policy</Link> for more information and browser control options.</p></> },
  { id: "providers", title: "Third-Party Services", content: <><p>We may use service providers for hosting, analytics, authentication, payments, artificial intelligence, advertising, and file processing. These providers process information under their own terms and privacy practices and only receive information needed for their service.</p></> },
  { id: "security", title: "Security and Retention", content: <><p>We use reasonable administrative and technical measures to protect information. No transmission or storage system can be guaranteed to be completely secure.</p><p>Retention periods depend on the type of information, the feature used, operational needs, and legal requirements. We remove or anonymize information when it is no longer needed.</p></> },
  { id: "choices", title: "Your Choices", content: <><p>You can control many cookies through your browser, choose not to create an account, and avoid uploading files you do not want processed. Account holders may contact us about access, correction, or deletion requests where applicable.</p></> },
  { id: "children", title: "Children's Privacy", content: <><p>Pixores is not directed to children under the age required to consent to online services in their location. We do not knowingly collect personal information from children without appropriate authorization.</p></> },
  { id: "changes", title: "Policy Changes and Contact", content: <><p>We may update this Privacy Policy as Pixores changes. The revised version will be posted here with a new update date.</p><p>Questions or privacy requests can be sent to <a href="mailto:support@pixores.com">support@pixores.com</a>.</p></> },
];

export default function PrivacyPolicyPage() {
  return <PolicyPage title="Privacy Policy" description="How Pixores handles account information, uploaded files, cookies, analytics, and third-party processing." lastUpdated="June 21, 2026" notice="Privacy is part of the product. We limit file processing to the operation requested and use local browser processing whenever the tool supports it." sections={sections} />;
}
