import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2026-02-25.clover" as any, 
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const invoiceId = session.metadata?.invoiceId;
      const projectId = session.metadata?.projectId; // Capture Project ID
      const amountPaidStr = session.metadata?.amountPaid;

      if (!amountPaidStr) return NextResponse.json({ success: false });
      const amountPaid = parseFloat(amountPaidStr);

      // --- CASE 1: INVOICE PAYMENT ---
      if (invoiceId) {
        const invoiceRef = doc(db, "invoices", invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          const data = invoiceSnap.data();
          if (data.processed_stripe_sessions?.includes(sessionId)) {
            return NextResponse.json({ success: true, message: "Already processed" });
          }

          const newAmountDue = Math.max(0, (data.amount_due || 0) - amountPaid);
          await updateDoc(invoiceRef, {
            amount_due: newAmountDue,
            status: newAmountDue <= 0 ? "completed" : data.status,
            processed_stripe_sessions: arrayUnion(sessionId)
          });
          return NextResponse.json({ success: true });
        }
      }

      // --- CASE 2: PROJECT DEPOSIT ---
      if (projectId) {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          const data = projectSnap.data();
          if (data.processed_stripe_sessions?.includes(sessionId)) {
            return NextResponse.json({ success: true });
          }

          // Update Project: Reduce amount due AND mark as approved
          const newAmountDue = Math.max(0, (data.amount_due || 0) - amountPaid);
          await updateDoc(projectRef, {
            amount_due: newAmountDue,
            approved: true, // Auto-approve upon deposit
            rejected: false,
            processed_stripe_sessions: arrayUnion(sessionId)
          });
          return NextResponse.json({ success: true });
        }
      }
    }

    return NextResponse.json({ success: false });
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}