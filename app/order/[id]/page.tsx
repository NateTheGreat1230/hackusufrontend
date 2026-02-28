"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, query, where, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle2, X, FileText, MoveRight } from "lucide-react";
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
           {/* Background line */}
           <div className="absolute left-8 right-8 top-5 -translate-y-1/2 h-1 bg-muted rounded-full"></div>
           {/* Animated fill line */}
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
  const token = searchParams.get("token");

  const [projectData, setProjectData] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) {
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
      if (data.token !== token) {
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
      const items = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const itemsWithProductData = await Promise.all(items.map(async (item: any) => {
        if (!item.product) return item;
        return new Promise<any>((resolve) => {
          onSnapshot(typeof item.product === 'string' ? doc(db, item.product) : item.product, (prodSnap: any) => {
            if (prodSnap.exists()) {
              resolve({ ...item, productData: { id: prodSnap.id, ...prodSnap.data() } });
            } else {
              resolve(item);
            }
          });
        });
      }));
      setLineItems(itemsWithProductData);
    });

    return () => {
      unsubscribeProject();
      unsubscribeItems();
    };
  }, [id, token]);

  const logEvent = async (note: string, type: string) => {
    if (!projectData?.timeline || !projectData?.company) return;
    const entryData = {
      company: projectData.company,
      generated_by: doc(db, "projects", id),
      note,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
      timeline: typeof projectData.timeline === 'string' ? doc(db, projectData.timeline) : projectData.timeline,
      type,
    };
    await addDoc(collection(db, "timeline_entries"), entryData);
  };

  const handleApprove = async () => {
    if (!projectData) return;
    await updateDoc(doc(db, "projects", id), {
      approved: true,
      rejected: false,
      status: "open"
    });
    
    if (projectData.ticket) {
      const ticketRef = typeof projectData.ticket === 'string' 
        ? doc(db, projectData.ticket) 
        : doc(db, "tickets", projectData.ticket.id);
      await updateDoc(ticketRef, { status: "complete" });
    }

    await logEvent("Approved the order proposal.", "approval");
  };

  const handleReject = async () => {
    if (!projectData) return;
    await updateDoc(doc(db, "projects", id), {
      approved: false,
      rejected: true,
    });
    await logEvent("Rejected the order proposal.", "rejection");
  };

  if (loading) return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center h-screen">Loading order details...</div>;
  if (error) return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center h-screen text-red-500 font-medium">{error}</div>;
  if (!projectData) return null;

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-col lg:flex-row h-full w-full">
      
        {/* Left Column: Details & Items */}
        <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full">
          <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-0">
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
                <div className="text-center py-6 text-muted-foreground">No line items in this order.</div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="font-medium p-3">Product</th>
                        <th className="font-medium p-3 w-16 sm:w-24">Qty</th>
                        <th className="font-medium p-3 w-20 sm:w-32 hidden sm:table-cell">Price</th>
                        <th className="font-medium p-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y relative">
                      {lineItems.map((item, idx) => {
                        const itemPrice = item.price !== undefined ? item.price : (item.productData?.price || 0);
                        return (
                          <tr key={item.id || idx} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div className="font-medium truncate max-w-[150px] sm:max-w-none">{item.productData?.name || 'Unknown Product'}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{item.productData?.sku || 'No SKU'}</div>
                            </td>
                            <td className="p-3">{item.qty || 1}</td>
                            <td className="p-3 hidden sm:table-cell">${itemPrice.toFixed(2)}</td>
                            <td className="p-3 text-right font-medium">
                              ${((item.qty || 1) * itemPrice).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-6 border-t pt-4 space-y-2">
                 <div className="flex justify-between items-center text-sm font-medium">
                   <span className="text-muted-foreground text-base">Total Cost</span>
                   <span className="text-lg font-bold">${(projectData.cost || projectData.amount || 0).toFixed(2)}</span>
                 </div>
                 {projectData.deposit_required > 0 && (
                   <div className="flex justify-between items-center text-sm font-medium pt-2 border-t">
                     <span className="text-muted-foreground text-base">Deposit Required</span>
                     <span className="text-lg font-bold text-blue-600">${projectData.deposit_required.toFixed(2)}</span>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proposal Status</CardTitle>
            </CardHeader>
            <CardContent>
              {projectData.approved ? (
                <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-md border border-green-200">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="font-semibold text-base">Approved</div>
                    <div className="text-sm opacity-90">You have approved this proposal. We will proceed with the order.</div>
                  </div>
                </div>
              ) : projectData.rejected ? (
                <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-md border border-red-200">
                  <X className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="font-semibold text-base">Rejected</div>
                    <div className="text-sm opacity-90">You have rejected this proposal. Please leave a note in the timeline to discuss changes.</div>
                  </div>
                  <Button variant="outline" className="ml-auto flex-shrink-0" onClick={handleApprove}>Change to Approve</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">Please review the proposed line items and total cost above. You can choose to approve or reject this proposal.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button onClick={handleApprove} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 cursor-pointer">Approve Proposal</Button>
                    <Button variant="destructive" onClick={handleReject} className="w-full sm:w-auto cursor-pointer">Reject Proposal</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column: Timeline */}
      <div className="lg:w-[550px] shrink-0 p-4 md:p-8 lg:p-12 h-[600px] lg:h-full flex flex-col">
        <div className="border bg-card flex flex-col h-full w-full rounded-2xl shadow-sm overflow-hidden">
          {projectData.timeline && projectData.company && (
            <Timeline 
              timelineId={typeof projectData.timeline === 'string' ? projectData.timeline : projectData.timeline.id}
              companyId={typeof projectData.company === 'string' ? projectData.company : projectData.company.id}
              generatedById={id}
              generatedByType="projects"
              isCustomerView={true}
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
