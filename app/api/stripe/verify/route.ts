import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2026-02-25.clover", // Ensure this matches your version
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    // 1. Ask Stripe for the details of this specific checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 2. Check if it was actually paid
    if (session.payment_status === "paid") {
      const invoiceId = session.metadata?.invoiceId;
      const amountPaidStr = session.metadata?.amountPaid;

      if (invoiceId && amountPaidStr) {
        const amountPaid = parseFloat(amountPaidStr);
        const invoiceRef = doc(db, "invoices", invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          const currentInvoice = invoiceSnap.data();

          // 3. Prevent double-counting if the user refreshes the success page!
          const processedSessions = currentInvoice.processed_stripe_sessions || [];
          if (processedSessions.includes(sessionId)) {
            return NextResponse.json({ message: "Already processed" });
          }

          // 4. Do the math and update Firebase
          const newAmountDue = Math.max(0, (currentInvoice.amount_due || 0) - amountPaid);
          const newStatus = newAmountDue <= 0 ? "completed" : currentInvoice.status;

          await updateDoc(invoiceRef, {
            amount_due: newAmountDue,
            status: newStatus,
            processed_stripe_sessions: arrayUnion(sessionId) // Mark this session as handled
          });

          return NextResponse.json({ success: true, newAmountDue });
        }
      }
    }

    return NextResponse.json({ success: false, message: "Payment not completed" });
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}