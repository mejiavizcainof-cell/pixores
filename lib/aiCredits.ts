import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AiCreditSession = {
  userId: string;
  credits: number;
};

export class AiCreditError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AiCreditError";
    this.status = status;
    this.code = code;
  }
}

export async function requireAiCredit(request: Request): Promise<AiCreditSession> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new AiCreditError("Please sign in to use this AI tool.", 401, "LOGIN_REQUIRED");
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    throw new AiCreditError("Your session is no longer valid. Please sign in again.", 401, "INVALID_SESSION");
  }

  const { data: creditRow, error: creditError } = await supabase
    .from("user_credits")
    .select("credits")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (creditError) {
    throw new AiCreditError("Credits could not be verified.", 500, "CREDIT_CHECK_FAILED");
  }

  let credits = creditRow?.credits ?? 5;

  if (!creditRow) {
    const { error: insertError } = await supabase.from("user_credits").insert({
      user_id: userData.user.id,
      credits,
    });

    if (insertError) {
      throw new AiCreditError("Credits could not be initialized.", 500, "CREDIT_SETUP_FAILED");
    }
  }

  if (credits <= 0) {
    throw new AiCreditError("You need at least one credit to use this AI tool.", 403, "NO_CREDITS");
  }

  return { userId: userData.user.id, credits };
}

export async function consumeAiCredit(session: AiCreditSession) {
  const creditsRemaining = Math.max(0, session.credits - 1);
  const { error } = await getSupabaseAdmin()
    .from("user_credits")
    .update({ credits: creditsRemaining, updated_at: new Date().toISOString() })
    .eq("user_id", session.userId);

  if (error) {
    throw new AiCreditError("The credit balance could not be updated.", 500, "CREDIT_UPDATE_FAILED");
  }

  return creditsRemaining;
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AiCreditError) {
    return Response.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : "The AI request could not be completed.";
  return Response.json({ success: false, error: message }, { status: 500 });
}
