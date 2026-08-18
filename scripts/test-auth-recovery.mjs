import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && anonKey && serviceRoleKey, "Supabase URL, anon key, and service role key are required for the live auth test.");

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceRoleKey, clientOptions);
const email = `pixores-beta62-${Date.now()}@example.com`;
const firstPassword = `Px!Beta62-${Date.now()}-First`;
const nextPassword = `Px!Beta62-${Date.now()}-Recovered`;
let userId = "";

try {
  const created = await admin.auth.admin.createUser({ email, password: firstPassword, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  const initialClient = createClient(url, anonKey, clientOptions);
  const initialSignIn = await initialClient.auth.signInWithPassword({ email, password: firstPassword });
  if (initialSignIn.error) throw initialSignIn.error;
  assert.equal(initialSignIn.data.user?.id, userId, "the temporary account must sign in through the public auth API");
  await initialClient.auth.signOut();

  const recovery = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: "https://www.pixores.com/reset-password" },
  });
  if (recovery.error) throw recovery.error;
  const recoveryTokenHash = recovery.data.properties?.hashed_token;
  assert(recoveryTokenHash, "Supabase must generate a recovery token hash");
  assert.match(recovery.data.properties?.action_link || "", /reset-password|type=recovery/, "the recovery link must target the Pixores reset flow");

  const recoveryClient = createClient(url, anonKey, clientOptions);
  const verified = await recoveryClient.auth.verifyOtp({ type: "recovery", token_hash: recoveryTokenHash });
  if (verified.error) throw verified.error;
  const updated = await recoveryClient.auth.updateUser({ password: nextPassword });
  if (updated.error) throw updated.error;
  await recoveryClient.auth.signOut();

  const finalClient = createClient(url, anonKey, clientOptions);
  const finalSignIn = await finalClient.auth.signInWithPassword({ email, password: nextPassword });
  if (finalSignIn.error) throw finalSignIn.error;
  assert.equal(finalSignIn.data.user?.id, userId, "the recovered password must sign in through the public auth API");
  await finalClient.auth.signOut();

  console.log("Live Pixores signup, sign-in, recovery, password update, and re-login test passed.");
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) throw removed.error;
  }
}
