import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2026-02-25.clover", // Updated to match your installed package
});

export async function POST(req: Request) {
  try {
    // Read the data sent from our frontend invoice page
    const { amount, invoiceId, companyId, invoiceNumber, currentUrl } = await req.json();

    // Stripe requires amounts to be in cents (e.g., $10.00 = 1000 cents)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${invoiceNumber || invoiceId}`,
              description: `Payment for invoice ${invoiceId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      // We pass this metadata so Stripe remembers what invoice this was for!
      metadata: {
        invoiceId: invoiceId,
        companyId: companyId,
        amountPaid: amount.toString()
      },
      // Where to send them after they pay (or if they click back)
// Notice the ?session_id={CHECKOUT_SESSION_ID} at the end!
      success_url: `${currentUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${currentUrl}?payment=cancelled`,
    });

    // Send the secure Stripe URL back to the frontend
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}