import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
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
    
    // Remember that metadata we passed in the checkout route? Here it is!
    const invoiceId = session.metadata?.invoiceId;
    const amountPaidStr = session.metadata?.amountPaid;

    if (invoiceId && amountPaidStr) {
      const amountPaid = parseFloat(amountPaidStr);

      try {
        const invoiceRef = doc(db, "invoices", invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          const currentInvoice = invoiceSnap.data();
          
          // Do the math
          const newAmountDue = Math.max(0, (currentInvoice.amount_due || 0) - amountPaid);
          const newStatus = newAmountDue <= 0 ? "completed" : currentInvoice.status;

          // Update Firebase
          await updateDoc(invoiceRef, {
            amount_due: newAmountDue,
            status: newStatus,
          });

          console.log(`✅ Successfully updated invoice ${invoiceId} after Stripe payment!`);
        } else {
          console.error(`Invoice ${invoiceId} not found in database.`);
        }
      } catch (error) {
        console.error("Error updating Firestore from webhook:", error);
      }
    }
  }

  // 4. Tell Stripe we got the message
  return NextResponse.json({ received: true });
}