import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { type PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Cookie Policy | Pixores",
  description: "Learn how Pixores uses essential, preference, analytics, and advertising cookies and how to manage them.",
  alternates: { canonical: "https://www.pixores.com/cookie-policy" },
};

const sections: PolicySection[] = [
  { id: "cookies", title: "What Cookies Are", content: <><p>Cookies are small text files stored by your browser. Similar technologies may use local storage, pixels, or identifiers to remember settings, secure sessions, understand usage, and support advertising.</p></> },
  { id: "types", title: "Cookies We May Use", content: <><h3>Essential cookies</h3><p>Needed for authentication, security, session continuity, preferences, and core site operation.</p><h3>Analytics cookies</h3><p>Help us understand page visits, tool usage, device categories, and performance so we can improve Pixores.</p><h3>Advertising cookies</h3><p>May be used by advertising partners to deliver, measure, and limit ads. These partners may recognize your browser across websites according to their own policies.</p></> },
  { id: "services", title: "Third-Party Services", content: <><p>Pixores may use providers such as Google Analytics and Google AdSense. These services may set or read cookies and process device or usage information under their own privacy documentation.</p></> },
  { id: "choices", title: "Managing Your Choices", content: <><p>Most browsers let you block, delete, or limit cookies. You can usually find these controls under privacy or site settings. Blocking essential storage may prevent login, saved settings, or other features from working correctly.</p><p>Where a consent control is presented, you can use it to manage optional categories. Browser privacy tools and advertising preference controls may provide additional choices.</p></> },
  { id: "duration", title: "How Long Cookies Last", content: <><p>Session cookies expire when the browser closes. Persistent cookies remain for a set period or until removed. Duration depends on the purpose and the provider that sets the cookie.</p></> },
  { id: "changes", title: "Updates and Contact", content: <><p>We may update this Cookie Policy when technologies, providers, or legal requirements change. Review our <Link href="/privacy-policy">Privacy Policy</Link> for broader information about data processing.</p><p>Questions can be sent to <a href="mailto:support@pixores.com">support@pixores.com</a>.</p></> },
];

export default function CookiePolicyPage() {
  return <PolicyPage title="Cookie Policy" description="How cookies and similar technologies support site functions, analytics, security, preferences, and advertising." lastUpdated="June 21, 2026" notice="You can manage cookies through your browser. Disabling essential storage may affect sign-in, saved preferences, and other site features." sections={sections} />;
}
