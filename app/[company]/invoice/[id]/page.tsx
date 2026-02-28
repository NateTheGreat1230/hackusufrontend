"use client";

import { use, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Printer, ArrowLeft, Building2, MapPin, Mail, Phone, CreditCard, DollarSign, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const resolvedParams = use(params);
  const company = resolvedParams.company;
  const id = resolvedParams.id;
  const router = useRouter();

  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Payment Modal State ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "manual">("card");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "invoices", id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInvoice({ id: docSnap.id, ...data });
        
        // Pre-fill payment amount when invoice loads
        setPaymentAmount(data.amount_due?.toFixed(2) || "0.00");

        // Load project if exists
        if (data.project) {
          try {
            const projSnap = await getDoc(data.project);
            if (projSnap.exists()) {
              setProjectData({ id: projSnap.id, ...(projSnap.data() as any) });
            } else {
              setProjectData(null);
            }
          } catch (e) {
            console.error("Error loading project", e);
          }
        }

        // Load customer if exists
        if (data.customer) {
          try {
            const custSnap = await getDoc(data.customer);
            if (custSnap.exists()) {
              setCustomer({ id: custSnap.id, ...(custSnap.data() as any) });
            } else {
              setCustomer(null);
            }
          } catch (e) {
            console.error("Error loading customer", e);
          }
        }

        // Load line items
        if (data.line_items && Array.isArray(data.line_items)) {
          const itemsData = await Promise.all(
            data.line_items.map(async (itemRef: any) => {
              if (itemRef.id) {
                const itemSnap = await getDoc(itemRef);
                if (itemSnap.exists()) {
                  return { id: itemSnap.id, ...(itemSnap.data() as any) };
                }
              }
              return null;
            })
          );
          setLineItems(itemsData.filter(i => i !== null));
        }
      } else {
        setInvoice(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [id]);

  // --- NEW: Verify Stripe Payment on Return ---
  useEffect(() => {
    // Grab the session_id from the URL
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      setIsProcessing(true);
      
      // Call our new verify route
      fetch("/api/stripe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("Payment successful! Your invoice has been updated.");
          // Clean up the URL so it doesn't verify again if they refresh
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      })
      .catch((err) => console.error("Error verifying payment:", err))
      .finally(() => setIsProcessing(false));
    }
  }, []);

  // --- Payment Processor ---
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(paymentAmount);
    
    // Safety checks
    if (isNaN(amount) || amount <= 0) return alert("Please enter a valid amount.");
    if (amount > invoice.amount_due) return alert("You cannot pay more than the amount due.");

    setIsProcessing(true);

    try {
      if (paymentMethod === "manual") {
        // Calculate the new math
        const newAmountDue = invoice.amount_due - amount;
        
        // If they paid it all off, mark it completed. Otherwise, keep current status.
        const newStatus = newAmountDue <= 0 ? "completed" : invoice.status;

        // Update Firestore
        const invoiceRef = doc(db, "invoices", invoice.id);
        await updateDoc(invoiceRef, {
          amount_due: newAmountDue,
          status: newStatus
        });

        // Close the modal
        setIsPaymentModalOpen(false);
      } else {
        // 1. Call our secure backend bridge
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amount,
            invoiceId: invoice.id,
            companyId: company,
            invoiceNumber: invoice.invoice_number || invoice.id,
            currentUrl: window.location.href, // Tell Stripe where to send them back to!
          }),
        });

        const data = await res.json();

        // 2. If Stripe gives us a URL, redirect the user there
        if (data.url) {
          window.location.href = data.url;
        } else {
          console.error("Stripe error:", data.error);
          alert("Failed to connect to Stripe. Make sure your API keys are in .env.local and you restarted your server!");
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("There was an error processing the payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col items-center bg-gray-50/50 min-h-screen py-8 px-4 w-full print:bg-white print:p-0 print:m-0 print:block print:min-h-0">
      <div className="w-full max-w-4xl space-y-6 print:space-y-0 print:max-w-none print:block">
        
        {/* Action Buttons Top Bar */}
        <div className="flex items-center justify-between print:hidden mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="space-x-2 flex">
            <Button variant="outline" onClick={() => window.print()} className="cursor-pointer">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            {/* Record Payment Button */}
            {invoice.amount_due > 0 && (
              <Button onClick={() => setIsPaymentModalOpen(true)} className="cursor-pointer bg-green-600 hover:bg-green-700 text-white">
                <DollarSign className="w-4 h-4 mr-2" /> Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Existing Invoice Card */}
        <Card className="shadow-lg print:shadow-none print:border-none print:w-full">
          <CardHeader className="border-b print:border-b-2 bg-white p-8 print:p-0 print:pb-8">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-light tracking-tight text-gray-900 mb-2">
                  INVOICE
                </CardTitle>
                <div className="text-sm text-muted-foreground flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>#{invoice.invoice_number || invoice.id.toUpperCase().slice(0, 8)}</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="font-semibold text-lg text-gray-900">Amount Due</p>
                <p className="text-3xl font-bold text-gray-900">${invoice.amount_due?.toFixed(2) || '0.00'}</p>
                <div className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium uppercase tracking-wider">
                  {invoice.status || 'Open'}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8 bg-white print:p-0 print:pt-8 print:w-full">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Billed To</h3>
                {customer ? (
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <Link href={`/${company}/customer/${customer.id}`} className="hover:underline text-blue-600">
                        {customer.first_name || customer.company_name} {customer.last_name || ""}
                      </Link>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {customer.email}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start gap-2 pt-1">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p>{typeof customer.address === 'string' ? customer.address : `${customer.address.street_1 || ''} ${customer.address.street_2 || ''}`.trim()}</p>
                          <p>{typeof customer.address === 'string' ? '' : `${customer.address.city ? `${customer.address.city}, ` : ''}${customer.address.state || ''} ${customer.address.zip || ''}`}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No Customer Associated</p>
                )}
              </div>

              <div className="space-y-4 text-right">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Invoice Date</span>
                    <span className="font-medium text-gray-900">
                      {new Date(invoice.time_created?.toMillis?.() || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  {invoice.project && invoice.project.id && (
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">Project</span>
                      <Link href={`/${company}/project/${invoice.project.id}`} className="font-medium text-blue-600 hover:underline">
                        {projectData?.number || invoice.project.id.toUpperCase().slice(0, 8)}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50 border-y">
                    <TableHead className="font-semibold text-gray-600">Item Name</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 w-24">Qty</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 w-32">Price</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 w-32">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No line items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lineItems.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-900">
                          {item.name || item.product_name || "Unnamed Item"}
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 font-normal">{item.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">{item.qty || 1}</TableCell>
                        <TableCell className="text-right text-gray-600">${Number(item.price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          ${((item.qty || 1) * (item.price || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {lineItems.length > 0 && (
                    <>
                      <TableRow className="border-t-2">
                        <TableCell colSpan={2} className="border-none" />
                        <TableCell className="text-right font-semibold text-gray-600 border-none pt-6">Subtotal</TableCell>
                        <TableCell className="text-right font-medium text-gray-900 border-none pt-6">${invoice.amount?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2} className="border-none hover:bg-transparent" />
                        <TableCell className="text-right font-bold text-gray-900 border-none text-lg">Total Due</TableCell>
                        <TableCell className="text-right font-bold text-gray-900 border-none text-lg">${invoice.amount_due?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Payment Modal --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">Process Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleProcessPayment} className="p-6 space-y-6">
              
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Payment Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="number" 
                    step="0.01" 
                    max={invoice.amount_due} // Prevent overpaying
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-medium" 
                  />
                </div>
                <p className="text-xs text-slate-500 text-right">Maximum: ${invoice.amount_due?.toFixed(2)}</p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setPaymentMethod("card")}
                    className={`border rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                  >
                    <CreditCard size={24} />
                    <span className="text-sm font-medium">Credit Card</span>
                  </div>
                  <div 
                    onClick={() => setPaymentMethod("manual")}
                    className={`border rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${paymentMethod === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                  >
                    <FileText size={24} />
                    <span className="text-sm font-medium">Manual Entry</span>
                  </div>
                </div>
              </div>

              {/* Notice based on method */}
              {paymentMethod === 'card' && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm text-slate-600">
                  You will be redirected to Stripe to securely process this credit card transaction.
                </div>
              )}
              {paymentMethod === 'manual' && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800">
                  Use this for cash, check, or external payments. This will immediately update the invoice balance.
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                  {isProcessing ? (
                    <Loader2 className="animate-spin w-4 h-4 mx-auto" />
                  ) : paymentMethod === 'card' ? (
                    'Proceed to Stripe'
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}