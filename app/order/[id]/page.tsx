"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, query, where, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle2, X, FileText, Loader2, CreditCard } from "lucide-react";
import Timeline from "@/components/Timeline";

function MilestoneTracker({ status }: { status?: string }) {
  const baseStatus = (status || "draft").toLowerCase();
  const stages = ["draft", "open", "completed"];
  
  if (baseStatus === "cancelled") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-3 text-red-600">
        <X className="w-6 h-6" />
        <span className="font-semibold">This order has been cancelled.</span>
      </div>
    );
  }

  const currentIndex = stages.indexOf(baseStatus) >= 0 ? stages.indexOf(baseStatus) : 0;
  
  return (
    <Card>
      <CardContent className="pt-6 pb-6">
         <div className="relative flex items-center justify-between max-w-2xl mx-auto px-4 sm:px-8">
           <div className="absolute left-8 right-8 top-5 -translate-y-1/2 h-1 bg-muted rounded-full"></div>
           <div 
             className="absolute left-8 top-5 -translate-y-1/2 h-1 bg-green-500 rounded-full transition-all duration-700 ease-in-out" 
             style={{ width: `calc(${(currentIndex / (stages.length - 1)) * 100}% - ${(currentIndex / (stages.length - 1)) * 4}rem)` }}
           ></div>

           {stages.map((stage, idx) => {
             const isPast = idx < currentIndex;
             const isCurrent = idx === currentIndex;
             const Icon = stage === "draft" ? FileText : stage === "open" ? Package : CheckCircle2;
             
             return (
               <div key={stage} className="relative z-10 flex flex-col items-center gap-3">
                 <div 
                   className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-background shadow-sm
                     ${isPast ? 'border-green-500 text-green-500 bg-green-50' : isCurrent ? 'border-blue-500 text-blue-600 ring-4 ring-blue-50' : 'border-muted-foreground/30 text-muted-foreground'}`
                   }
                 >
                   <Icon className="w-5 h-5" />
                 </div>
                 <span className={`text-sm font-bold capitalize ${isPast || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                   {stage === 'draft' ? 'Quote' : stage}
                 </span>
               </div>
             );
           })}
         </div>
      </CardContent>
    </Card>
  )
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");

  // Robust token state
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [isTokenReady, setIsTokenReady] = useState(false);

  const [projectData, setProjectData] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const hasVerified = useRef(false);

  // 1. TOKEN SAFETY NET: Recovers the token if Stripe drops it from the URL
  useEffect(() => {
    if (urlToken) {
      // If it's in the URL, save it to local storage
      localStorage.setItem(`order_token_${id}`, urlToken);
      setActiveToken(urlToken);
    } else {
      // If it's missing, try to recover it from local storage
      const savedToken = localStorage.getItem(`order_token_${id}`);
      if (savedToken) {
        setActiveToken(savedToken);
        // Quietly put it back into the URL so the page looks normal
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("token", savedToken);
        window.history.replaceState({}, document.title, newUrl.toString());
      }
    }
    setIsTokenReady(true);
  }, [urlToken, id]);

  // 2. FETCH PROJECT DATA
  useEffect(() => {
    if (!isTokenReady) return; // Wait for the token safety net to finish

    if (!id || !activeToken) {
      setError("Invalid or missing order link.");
      setLoading(false);
      return;
    }

    const projectRef = doc(db, "projects", id);
    const unsubscribeProject = onSnapshot(projectRef, (snap) => {
      if (!snap.exists()) {
        setError("Order not found.");
        setLoading(false);
        return;
      }
      
      const data = snap.data();
      // Security check against the recovered token
      if (data.token && data.token !== activeToken) {
        setError("Invalid secure token for this order.");
        setLoading(false);
        return;
      }

      setProjectData({ id: snap.id, ...data });
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Error loading order.");
      setLoading(false);
    });

    const qItems = query(collection(db, "product_instances"), where("project", "==", projectRef));
    const unsubscribeItems = onSnapshot(qItems, async (snap) => {
      const items = snap.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
      const itemsWithProductData = await Promise.all(items.map(async (item: any) => {
        if (!item.product) return item;
        const prodRef = typeof item.product === 'string' ? doc(db, item.product) : item.product;
        const prodSnap = await getDoc(prodRef);
        return prodSnap.exists() ? { ...item, productData: { id: prodSnap.id, ...(prodSnap.data() || {}) } } : item;
      }));
      setLineItems(itemsWithProductData);
    });

    return () => {
      unsubscribeProject();
      unsubscribeItems();
    };
  }, [id, activeToken, isTokenReady]);

  // 3. VERIFY STRIPE PAYMENT & CLEANUP URL
  useEffect(() => {
    if (!id || !activeToken || !projectData || hasVerified.current) return; 
    
    const sessionId = searchParams.get("session_id");

    if (sessionId) {
      hasVerified.current = true;
      setIsProcessingPayment(true);
      
      fetch("/api/stripe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.success) {
          // Cleanup URL (removes session_id, keeps the recovered token)
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("session_id");
          window.history.replaceState({}, document.title, newUrl.toString());

          // We don't need to manually update the DB here because your backend verify route 
          // is already doing it successfully! We just wait for the snapshot to update the UI.
        }
      })
      .catch((err) => console.error("Error verifying payment:", err))
      .finally(() => setIsProcessingPayment(false));
    }
  }, [id, activeToken, projectData, searchParams]);

  const handlePayDeposit = async () => {
    if (!projectData) return;
    setIsProcessingPayment(true);

    try {
      const companyId = typeof projectData.company === 'string' ? projectData.company : projectData.company?.id;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: projectData.deposit_required, // Charging the deposit amount
          projectId: id,
          companyId: companyId,
          projectNumber: projectData.number || id,
          currentUrl: window.location.href, 
          token: activeToken, // ADD THIS LINE: Sends the token to the checkout script
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to connect to Stripe.");
        setIsProcessingPayment(false);
      }
    } catch (error) {
      alert("There was an error processing the payment.");
      setIsProcessingPayment(false);
    }
  };

  const handleApprove = async () => {
    if (!projectData) return;
    await updateDoc(doc(db, "projects", id), { approved: true, rejected: false });
    
    if (projectData.timeline && projectData.company) {
      await addDoc(collection(db, "timeline_entries"), {
        company: projectData.company,
        generated_by: doc(db, "projects", id),
        note: "Customer manually approved the order proposal.",
        time_created: serverTimestamp(),
        time_updated: serverTimestamp(),
        timeline: typeof projectData.timeline === 'string' ? doc(db, projectData.timeline) : projectData.timeline,
        type: "approval",
      });
    }
  };

  const handleReject = async () => {
    if (!projectData) return;
    await updateDoc(doc(db, "projects", id), { approved: false, rejected: true });

    if (projectData.timeline && projectData.company) {
      await addDoc(collection(db, "timeline_entries"), {
        company: projectData.company,
        generated_by: doc(db, "projects", id),
        note: "Customer rejected the order proposal.",
        time_created: serverTimestamp(),
        time_updated: serverTimestamp(),
        timeline: typeof projectData.timeline === 'string' ? doc(db, projectData.timeline) : projectData.timeline,
        type: "rejection",
      });
    }
  };

  if (loading) return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center h-screen">Loading order details...</div>;
  if (error) return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center h-screen text-red-500 font-medium">{error}</div>;
  if (!projectData) return null;

  const totalAmount = projectData.amount || projectData.cost || 0;
  const amountDue = projectData.amount_due ?? totalAmount;
  const amountPaid = totalAmount - amountDue;
  const depositAmount = projectData.deposit_required || 0;
  const hasPaidDeposit = depositAmount > 0 && amountPaid >= depositAmount;

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-col lg:flex-row h-full w-full">
      
        {/* Left Column: Details & Timeline */}
        <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full lg:border-r border-slate-100">
          <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-0">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                Order #{projectData.number || projectData.id.slice(0, 6)}
              </h1>
              <p className="text-muted-foreground">Review your project and proposal details below.</p>
            </div>

            <MilestoneTracker status={projectData.status} />

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lineItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No line items.</div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="font-medium p-3">Product</th>
                          <th className="font-medium p-3 w-16">Qty</th>
                          <th className="font-medium p-3 w-32 hidden sm:table-cell">Price</th>
                          <th className="font-medium p-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lineItems.map((item, idx) => {
                          const itemPrice = item.price !== undefined ? item.price : (item.productData?.price || 0);
                          return (
                            <tr key={item.id || idx} className="hover:bg-muted/30">
                              <td className="p-3">
                                <div className="font-medium truncate max-w-[150px] sm:max-w-none">{item.productData?.name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{item.productData?.sku || 'No SKU'}</div>
                              </td>
                              <td className="p-3">{item.qty || 1}</td>
                              <td className="p-3 hidden sm:table-cell">${itemPrice.toFixed(2)}</td>
                              <td className="p-3 text-right font-medium">${((item.qty || 1) * itemPrice).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {projectData.timeline && projectData.company && (
              <Card className="flex flex-col h-[500px] overflow-hidden mt-8">
                <CardHeader className="border-b bg-muted/10 pb-4">
                  <CardTitle className="text-lg">Project Timeline</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 relative bg-white">
                  <div className="absolute inset-0">
                    <Timeline 
                      timelineId={typeof projectData.timeline === 'string' ? projectData.timeline : projectData.timeline.id}
                      companyId={typeof projectData.company === 'string' ? projectData.company : projectData.company.id}
                      generatedById={id}
                      generatedByType="projects"
                      isCustomerView={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Checkout & Actions */}
        <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 p-4 md:p-8 lg:p-12 bg-slate-50/50">
          <div className="sticky top-8 space-y-6">
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="bg-white border-b border-slate-100 pb-4 rounded-t-xl">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6 bg-white">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Cost</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  {depositAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Deposit Paid</span>
                        <span className="font-medium text-green-600">${Math.min(amountPaid, depositAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t font-semibold text-base">
                        <span className="text-slate-900">Deposit Due Now</span>
                        <span className="text-blue-600">${hasPaidDeposit ? '0.00' : depositAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  {projectData.approved ? (
                    <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-md border border-green-200 mt-4">
                      <CheckCircle2 className="w-6 h-6 shrink-0" />
                      <div>
                        <div className="font-semibold text-base">Approved</div>
                        <div className="text-sm opacity-90">Order accepted. Work will begin shortly.</div>
                      </div>
                    </div>
                  ) : projectData.rejected ? (
                    <div className="space-y-4 mt-4">
                      <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-md border border-red-200">
                        <X className="w-6 h-6 shrink-0" />
                        <div>
                          <div className="font-semibold text-base">Declined</div>
                          <div className="text-sm opacity-90">Proposal declined.</div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full cursor-pointer" onClick={handleApprove}>Re-Evaluate & Accept</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 mt-4">
                      {depositAmount > 0 && !hasPaidDeposit ? (
                        <>
                          <p className="text-xs text-muted-foreground text-center mb-1">Deposit required to accept order.</p>
                          <Button onClick={handlePayDeposit} disabled={isProcessingPayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base shadow-sm cursor-pointer">
                            {isProcessingPayment ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
                            Pay Deposit & Accept
                          </Button>
                        </>
                      ) : (
                        <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base shadow-sm cursor-pointer">
                          <CheckCircle2 className="mr-2" /> Accept Proposal
                        </Button>
                      )}
                      <Button variant="ghost" onClick={handleReject} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer">Decline Proposal</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}