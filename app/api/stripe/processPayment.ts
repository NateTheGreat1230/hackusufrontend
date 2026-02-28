import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc, arrayUnion, query, collection, where, getDocs, runTransaction, serverTimestamp, setDoc, addDoc } from "firebase/firestore";
import { formatEntityNumber } from "@/lib/utils";

export async function processStripePayment(session: any) {
  const sessionId = session.id;
  const invoiceId = session.metadata?.invoiceId;
  const projectId = session.metadata?.projectId;
  const amountPaidStr = session.metadata?.amountPaid;
  const companyId = session.metadata?.companyId;

  if (!amountPaidStr) return false;
  const amountPaid = parseFloat(amountPaidStr);

  if (invoiceId) {
    const invoiceRef = doc(db, "invoices", invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (invoiceSnap.exists()) {
      const data = invoiceSnap.data();
      if (data.processed_stripe_sessions?.includes(sessionId)) return true;
      const newAmountDue = Math.max(0, (data.amount_due || 0) - amountPaid);
      await updateDoc(invoiceRef, {
        amount_due: newAmountDue,
        status: newAmountDue <= 0 ? "completed" : data.status,
        processed_stripe_sessions: arrayUnion(sessionId)
      });
      return true;
    }
  }

  if (projectId) {
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      const data = projectSnap.data();
      if (data.processed_stripe_sessions?.includes(sessionId)) return true;

      const newAmountDue = Math.max(0, (data.amount_due || 0) - amountPaid);
      await updateDoc(projectRef, {
        amount_due: newAmountDue,
        approved: true,
        rejected: false,
        status: "open", 
        processed_stripe_sessions: arrayUnion(sessionId)
      });
      
      let companyRef = data.company;
      if (!companyRef && companyId) {
          companyRef = doc(db, "companies", companyId);
      }

      // Safe query fallback for Node environment Reference mismatch:
      const instSnap = await getDocs(collection(db, "product_instances"));
      const myItems = instSnap.docs.filter(d => {
          const p = d.data().project;
          return p && (p.id === projectId || p === projectId);
      });
      
      for (const itemDoc of myItems) {
          const itemData = itemDoc.data();
          if (itemData.product) {
              const productId = typeof itemData.product === 'string' ? itemData.product : itemData.product.id;
              const productRef = doc(db, "products", productId);
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                  const prodData = productSnap.data() as any;
                  if (prodData.is_manufactured) {
                      let stepsToUse = prodData.manufacturing_steps || [];
                      
                      try {
                          let newNumber = 1001;
                          await runTransaction(db, async (trans) => {
                              const counterRef = doc(db, "counters", "manufacturing_orders");
                              const cSnap = await trans.get(counterRef);
                              if (cSnap.exists()) {
                                  newNumber = (cSnap.data().last_number || 1000) + 1;
                              }
                              trans.set(counterRef, { last_number: newNumber }, { merge: true });
                          });

                          // Create timeline
                          const newTimelineRef = await addDoc(collection(db, "timelines"), {
                              company: companyRef,
                              time_created: serverTimestamp(),
                              time_updated: serverTimestamp(),
                          });

                          const newOrderRef = doc(collection(db, "manufacturing_orders"));
                          
                          const formattedSteps = stepsToUse.map((s: any, idx: number) => ({
                              id: `step-${Date.now()}-${idx}`,
                              description: typeof s === 'string' ? s : (s.description || ""),
                              is_completed: false,
                              notes: ""
                          }));

                          await setDoc(newOrderRef, {
                              number: newNumber,
                              company: companyRef,
                              project: projectRef,
                              product_ref: productRef,
                              product_name: prodData.name || formatEntityNumber(newNumber, 'MO'),
                              status: "not_started",
                              start_date: serverTimestamp(),
                              steps: formattedSteps,
                              bom: prodData.bom || [],
                              product_instance_id: itemDoc.id,
                              qty: itemData.qty || 1,
                              time_created: serverTimestamp(),
                              time_updated: serverTimestamp(),
                              timeline: newTimelineRef
                          });

                          // Add entry
                          await addDoc(collection(db, "timeline_entries"), {
                              company: companyRef,
                              generated_by: newOrderRef,
                              note: `Manufacturing Order ${formatEntityNumber(newNumber, 'MO')} generated.`,
                              type: "creation",
                              timeline: newTimelineRef,
                              time_created: serverTimestamp(),
                              time_updated: serverTimestamp(),
                          });

                      } catch (err) {
                        console.error("Failed to create MO:", err);
                      }
                  }
              }
          }
      }

      if (data.ticket) {
        const ticketRef = typeof data.ticket === 'string' ? doc(db, data.ticket) : doc(db, "tickets", data.ticket.id);
        await updateDoc(ticketRef, { status: "complete" });
      }

      return true;
    }
  }

  return false;
}
