import { NextResponse } from "next/server";
import Stripe from "stripe";
import { processStripePayment } from "../processPayment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2026-02-25.clover" as any, 
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const success = await processStripePayment(session);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ success: false });
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
