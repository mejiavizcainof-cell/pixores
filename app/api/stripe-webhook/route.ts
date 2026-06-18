import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  try {
    const rawSession = event.data.object as Stripe.Checkout.Session;

    const session = await stripe.checkout.sessions.retrieve(rawSession.id);

    const userId = session.metadata?.userId;
    const creditsToAdd = Number(session.metadata?.credits || 0);

    console.log("STRIPE SESSION METADATA:", session.metadata);

    if (!userId || !creditsToAdd) {
      return NextResponse.json(
        {
          error: "Missing userId or credits in metadata",
          metadata: session.metadata,
        },
        { status: 400 }
      );
    }

    const { data: existingCredits, error: fetchError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("FETCH ERROR:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingCredits) {
      const { error: insertError } = await supabaseAdmin
        .from("user_credits")
        .insert({
          user_id: userId,
          credits: creditsToAdd,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("INSERT ERROR:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("user_credits")
        .update({
          credits: existingCredits.credits + creditsToAdd,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("UPDATE ERROR:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("WEBHOOK ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Webhook failed" },
      { status: 500 }
    );
  }
}