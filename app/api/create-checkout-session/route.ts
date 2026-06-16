import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const CREDIT_PACKAGES: Record<
  string,
  { name: string; credits: number; price: number }
> = {
  starter: {
    name: "Starter",
    credits: 50,
    price: 499,
  },
  creator: {
    name: "Creator",
    credits: 200,
    price: 999,
  },
  pro: {
    name: "Pro",
    credits: 500,
    price: 1999,
  },
};

export async function POST(request: NextRequest) {
  try {
    const { packageId, userId } = await request.json();

    const selectedPackage = CREDIT_PACKAGES[packageId];

    if (!selectedPackage) {
      return NextResponse.json(
        { error: "Invalid credit package" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${selectedPackage.name} Credits`,
              description: `${selectedPackage.credits} AI background removal credits`,
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/thumbnail-creator?payment=success`,
      cancel_url: `${request.nextUrl.origin}/thumbnail-creator?payment=cancelled`,
      metadata: {
        userId,
        packageId,
        credits: String(selectedPackage.credits),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Stripe checkout failed" },
      { status: 500 }
    );
  }
}