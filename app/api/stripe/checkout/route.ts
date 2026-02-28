import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16", // Use the latest API version Stripe provides
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
      success_url: `${currentUrl}?payment=success`,
      cancel_url: `${currentUrl}?payment=cancelled`,
    });

    // Send the secure Stripe URL back to the frontend
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}