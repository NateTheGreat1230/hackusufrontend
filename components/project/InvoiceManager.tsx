import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDocs, getCountFromServer } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface InvoiceManagerProps {
  companyId: string;
  projectId: string;
  projectData: any;
  logEvent?: (note: string, type?: string) => Promise<void>;
}

export function InvoiceManager({ companyId, projectId, projectData, logEvent }: InvoiceManagerProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const q = query(collection(db, "invoices"), where("project", "==", projectRef));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      invs.sort((a: any, b: any) => {
        const da = a.time_created?.toMillis?.() || 0;
        const db = b.time_created?.toMillis?.() || 0;
        return db - da;
      });
      setInvoices(invs);
    });
    
    return () => unsubscribe();
  }, [projectId]);

  const handleCreateInvoice = async () => {
    // Get all line items for this project
    const projectRef = doc(db, "projects", projectId);
    const qItems = query(collection(db, "product_instances"), where("project", "==", projectRef));
    const itemsSnap = await getDocs(qItems);
    
    const allProjectItems = itemsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any));
    
    // Determine which items are already attached to an invoice
    const invoicedItems = new Set<string>();
    invoices.forEach(inv => {
      if (inv.line_items && Array.isArray(inv.line_items)) {
        inv.line_items.forEach((itemRef: any) => {
          const id = typeof itemRef === 'string' ? itemRef.split('/').pop() : itemRef.id;
          if (id) invoicedItems.add(id);
        });
      }
    });

    const uninvoicedItems = allProjectItems.filter(item => !invoicedItems.has(item.id));

    if (uninvoicedItems.length === 0) {
      alert("All current items have already been invoiced.");
      return;
    }

    // Calculate totals
    const totalAmount = uninvoicedItems.reduce((acc, item) => {
       const qty = item.qty || 1;
       const price = item.price || 0;
       return acc + (qty * price);
    }, 0);

    const qInvoicesCount = query(collection(db, "invoices"));
    const countSnapshot = await getCountFromServer(qInvoicesCount);
    const count = countSnapshot.data().count;
    const newInvoiceNumber = 1000 + count + 1;

    const invoiceRef = await addDoc(collection(db, "invoices"), {
      number: newInvoiceNumber,
      company: doc(db, "companies", companyId),
      project: projectRef,
      customer: projectData.customer || null,
      timeline: projectData.timeline || null,
      line_items: uninvoicedItems.map(i => doc(db, "product_instances", i.id)),
      amount: totalAmount,
      amount_due: totalAmount,
      status: "open",
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    if (logEvent) {
      await logEvent(`User generated Invoice for $${totalAmount.toFixed(2)}.`, "invoice_created");
    }

    router.push(`/${companyId}/invoice/${invoiceRef.id}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-800" /> Invoices
        </CardTitle>
        <Button size="sm" onClick={handleCreateInvoice} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No invoices generated yet.
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <div 
                key={inv.id} 
                className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/${companyId}/invoice/${inv.id}`)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{inv.number ? `INV${inv.number}` : (inv.invoice_number ? inv.invoice_number : `INV${inv.id.toUpperCase().slice(0, 8)}`)} - ${inv.amount?.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">
                     {new Date(inv.time_created?.toMillis?.() || Date.now()).toLocaleDateString()} &middot; {inv.status || 'open'}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/${companyId}/invoice/${inv.id}`); }} className="cursor-pointer">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
