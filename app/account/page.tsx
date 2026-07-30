import type { Metadata } from "next";
import AccountPortal from "@/components/AccountPortal";

export const metadata: Metadata = {
  title: "Pixores Account",
  description: "Create or access your Pixores account for Pixores web and desktop tools.",
};

type AccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const values = await searchParams;
  const confirmed = values.confirmed === "1";

  return (
    <AccountPortal
      initialMode={values.mode === "signup" ? "signup" : "login"}
      initialMessage={confirmed ? "Email confirmed. Sign in to continue with Pixores." : ""}
    />
  );
}
