import { NextResponse } from "next/server";
import Stripe from "stripe";
import { processStripePayment } from "../processPayment";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2026-02-25.clover", // Updated to match your installed package
});

// This is the whsec_ secret you got from the Stripe CLI
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  // 1. Get the raw body and the Stripe signature header
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  // 2. Verify the phone call is ACTUALLY from Stripe
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // 3. Handle a successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await processStripePayment(session);
  }

  // 4. Tell Stripe we got the message
  return NextResponse.json({ received: true });
}
