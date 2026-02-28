import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover" as any,
});

export async function POST(req: Request) {
  try {
    const { amount, invoiceId, projectId, companyId, invoiceNumber, projectNumber, currentUrl, token } = await req.json();

    // 1. Build the success URL and ensure the TOKEN is preserved
    const url = new URL(currentUrl);
    url.searchParams.set("token", token); // Re-attach the token for the return trip
    const successUrl = `${url.toString()}&session_id={CHECKOUT_SESSION_ID}`;

    // 2. Create the Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: projectId ? `Deposit for Order #${projectNumber}` : `Invoice #${invoiceNumber}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: currentUrl,
      metadata: {
        invoiceId: invoiceId || "",
        projectId: projectId || "", // Pass the Project ID to metadata for the verify script
        amountPaid: amount.toString(),
        companyId: companyId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}