import fs from "node:fs/promises";
import path from "node:path";

const LICENSE_VERSION = 1;

const PLAN_LABELS = Object.freeze({
  not_signed_in: "Not signed in",
  free: "Free",
  pro: "Pro",
  lifetime: "Lifetime",
});

function createStatus(plan, patch = {}) {
  return {
    ok: true,
    plan,
    label: PLAN_LABELS[plan] || PLAN_LABELS.not_signed_in,
    source: plan === "not_signed_in" ? "none" : "local",
    ...patch,
  };
}

function normalizeLicenseKey(value) {
  return String(value || "").trim().toUpperCase();
}

function getPlanFromLicenseKey(licenseKey) {
  if (licenseKey.startsWith("PIXORES-LIFETIME-")) return "lifetime";
  if (licenseKey.startsWith("PIXORES-PRO-")) return "pro";
  return "free";
}

function cleanLicensePayload(value) {
  if (!value || typeof value !== "object") return createStatus("not_signed_in");

  const plan = ["free", "pro", "lifetime"].includes(value.plan) ? value.plan : "not_signed_in";
  return createStatus(plan, {
    licenseKey: typeof value.licenseKey === "string" ? value.licenseKey : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    accountEmail: typeof value.accountEmail === "string" ? value.accountEmail : undefined,
    customerId: typeof value.customerId === "string" ? value.customerId : undefined,
    subscriptionId: typeof value.subscriptionId === "string" ? value.subscriptionId : undefined,
    provider: ["manual", "stripe", "supabase"].includes(value.provider) ? value.provider : "manual",
  });
}

export function createDesktopLicenseHandlers({ app }) {
  const licensePath = path.join(app.getPath("userData"), "license.json");

  async function writeLicenseStatus(status) {
    await fs.mkdir(path.dirname(licensePath), { recursive: true });
    await fs.writeFile(
      licensePath,
      JSON.stringify({
        version: LICENSE_VERSION,
        ...status,
      }, null, 2),
      "utf8",
    );
  }

  return {
    async getLicenseStatus() {
      try {
        const parsed = JSON.parse(await fs.readFile(licensePath, "utf8"));
        return cleanLicensePayload(parsed);
      } catch {
        return createStatus("not_signed_in");
      }
    },

    async saveLicenseStatus(input) {
      const licenseKey = normalizeLicenseKey(input?.licenseKey);
      if (!licenseKey) {
        throw new Error("licenseKey is required.");
      }

      const now = new Date().toISOString();
      const status = createStatus(getPlanFromLicenseKey(licenseKey), {
        licenseKey,
        updatedAt: now,
        accountEmail: input?.accountEmail ? String(input.accountEmail).trim() : undefined,
        provider: "manual",
      });

      await writeLicenseStatus(status);
      return status;
    },

    async clearLicenseStatus() {
      try {
        await fs.rm(licensePath, { force: true });
      } catch {
        // Clearing should be idempotent.
      }

      return createStatus("not_signed_in");
    },
  };
}
