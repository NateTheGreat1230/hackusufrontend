"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, arrayUnion, collection, addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ManufacturingOrder, ManufacturingStep, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, CircleDashed, Circle, Plus, Trash2, ArrowLeft, PackageCheck, Package, Loader2, X, Check, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDialog } from "@/lib/dialog-context";

export default function ManufacturingOrderPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { alert, confirm } = useDialog();
  
  const [order, setOrder] = useState<ManufacturingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [loadingBOM, setLoadingBOM] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  // New Step State
  const [newStepDesc, setNewStepDesc] = useState("");

  useEffect(() => {
    let bomLoaded = false;
    
    const unsub = onSnapshot(doc(db, "manufacturing_orders", id), async (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as ManufacturingOrder;
        setOrder(orderData);
        setLoading(false); // Ensure main loading is turned off immediately

        // Load BOM Details if referenced product has them
        if (orderData.product_ref) {
            if (!bomLoaded) setLoadingBOM(true);
            
            try {
                // Fetch product details for names/display
                const prodSnap = await getDoc(orderData.product_ref); 
                const prodData = prodSnap.exists() ? { id: prodSnap.id, ...(prodSnap.data() || {}) } as Product : null;

                // Determine which BOM to use: Order's explicit BOM or fallback to Product's BOM
                // Ensure we handle cases where bom is undefined or empty elegantly
                const orderBOM = orderData.bom || [];
                const productBOM = prodData?.bom || [];
                const sourceBOM = (orderBOM.length > 0) ? orderBOM : productBOM;

                if (sourceBOM && sourceBOM.length > 0) {
                     const enrichedBOM = await Promise.all(sourceBOM.map(async (b) => {
                         if (!b.product) return null;
                         
                         // Always reconstruct the reference to ensure valid DocumentReference
                         const productId = typeof b.product === 'string' ? b.product : b.product.id;
                         if (!productId) return null;

                         const pDataRef = doc(db, "products", productId);
                         const pSnap = await getDoc(pDataRef);
                         const pData = pSnap.data() as any;
                         
                         return { 
                             ...b, 
                             product: pDataRef, // Ensure consistent format
                             productName: pSnap.exists() && pData ? pData.name : "Unknown Product",
                             projectId: pSnap.id,
                             currentQty: pSnap.exists() && pData ? pData.qty || 0 : 0,
                             is_picked: b.is_picked || false
                         };
                     }));
                     // Filter out any nulls from invalid items
                     setBomItems(enrichedBOM.filter(Boolean));
                 } else {
                     setBomItems([]);
                 }
                
                // Also load steps if order has none (sync with template)
                // Ensure we don't trigger recursive updates if steps are already there
                if (prodData && (!orderData.steps || orderData.steps.length === 0) && prodData.manufacturing_steps && prodData.manufacturing_steps.length > 0) {
                    const templateSteps = prodData.manufacturing_steps.map((s, idx) => ({
                        id: `templ-${Date.now()}-${idx}`, // Use timestamp to ensure more uniqueness if regenerated
                        description: s.description,
                        is_completed: false,
                        notes: ""
                    }));
                    // Update the order with template steps
                    await updateDoc(doc(db, "manufacturing_orders", id), {
                            steps: templateSteps
                    });
                }
                
                // Load info if name is missing from order but we have product
                if (prodData && !orderData.product_name) {
                     await updateDoc(doc(db, "manufacturing_orders", id), {
                            product_name: prodData.name || "Unnamed Product"
                     });
                }
            } catch (err) {
                console.error("Error loading BOM:", err);
                if (!bomLoaded) setBomItems([]);
            } finally {
                setLoadingBOM(false);
                bomLoaded = true;
            }
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id]);

  const handleAddStep = async () => {
    if (!newStepDesc.trim() || isLocked) return;
    
    const newStep: ManufacturingStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: newStepDesc,
      is_completed: false,
      notes: ""
    };

    try {
      const orderRef = doc(db, "manufacturing_orders", id);
      // If "steps" doesn't exist, it will be created
      await updateDoc(orderRef, {
        steps: arrayUnion(newStep)
      });
      setNewStepDesc("");
    } catch (err) {
      console.error("Error adding step:", err);
    }
  };

  const isLocked = order?.status === 'completed';

  const toggleBOMItemPicked = async (index: number) => {
    if (!order || isLocked) return;
    
    // Construct the BOM array to save (strip out enriched display properties)
    const updatedBOM = bomItems.map((item, i) => ({
        product: item.product,
        qty: item.qty,
        is_picked: i === index ? !item.is_picked : (item.is_picked || false)
    }));

    await updateDoc(doc(db, "manufacturing_orders", id), {
        bom: updatedBOM
    });
  };

  const toggleStep = async (index: number) => {
    if (!order || !order.steps || isLocked) return;
    
    // Create a copy of the steps array
    const updatedSteps = [...order.steps];
    
    // Toggle the specific step at the index
    if (updatedSteps[index]) {
        updatedSteps[index] = {
            ...updatedSteps[index],
            is_completed: !updatedSteps[index].is_completed
        };
        
        await updateDoc(doc(db, "manufacturing_orders", id), {
            steps: updatedSteps
        });
    }
  };

  const updateStepNotes = async (index: number, notes: string) => {
    if (!order || !order.steps || isLocked) return;
    
    const updatedSteps = [...order.steps];
    
    if (updatedSteps[index]) {
        updatedSteps[index] = {
            ...updatedSteps[index],
            notes: notes
        };
        
        await updateDoc(doc(db, "manufacturing_orders", id), {
          steps: updatedSteps
        });
    }
  };

  const toggleNotes = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const key = `note-${index}`; // Use index-based key for local state too
      const newSet = new Set(expandedNotes);
      if (newSet.has(key)) {
          newSet.delete(key);
      } else {
          newSet.add(key);
      }
      setExpandedNotes(newSet);
  };

  const handleDeleteStep = async (index: number) => {
      if (!order || !order.steps || isLocked) return;
      
      const updatedSteps = order.steps.filter((_, i) => i !== index);
      
      await updateDoc(doc(db, "manufacturing_orders", id), {
          steps: updatedSteps
      });
  };

  const handleProduce = async () => {
      if (!order || !order.product_ref || !bomItems) return;
      if (!await confirm("Confirm production? This will deduct component inventory and increase the finished product inventory.")) return;
       
      setIsCompleting(true);
      try {
           // 1. Deduct Inventory for BOM Items
           for (const item of bomItems) {
               const itemRef = typeof item.product === 'string' ? doc(db, "products", item.product) : item.product;
               // Get fresh copy to ensure atomic transaction-like behavior (simplified here)
               const snap = await getDoc(itemRef);
               if (snap.exists()) {
                   const curr = (snap.data() as any)?.qty || 0;
                   if (curr < item.qty) {
                       throw new Error(`Insufficient inventory for ${item.productName}`);
                   }
                   await updateDoc(itemRef, { qty: curr - item.qty });
               }
           }
           
           // 2. Add Inventory for Finished Product
           const finishedProdRef = order.product_ref;
           const finishedSnap = await getDoc(finishedProdRef);
           if (finishedSnap.exists()) {
               await updateDoc(finishedProdRef, { qty: ((finishedSnap.data() as any)?.qty || 0) + 1 });
           }
           
           // 3. Complete Order
           await updateDoc(doc(db, "manufacturing_orders", id), {
               status: "completed",
               time_completed: serverTimestamp()
           });
           
           // 4. Log event on project timeline if linked
           if (order.project) {
               const projRef = typeof order.project === 'string' ? doc(db, order.project) : order.project;
               const projSnap = await getDoc(projRef);
               if (projSnap.exists()) {
                   const pData = projSnap.data() as any;
                   if (pData.timeline) {
                       const timelineRef = typeof pData.timeline === 'string' ? doc(db, pData.timeline) : pData.timeline;
                       const entryData: any = {
                           company: doc(db, "companies", company),
                           generated_by: doc(db, "manufacturing_orders", id),
                           note: `Manufacturing Order ${order.number ? `#${order.number}` : id} was completed.`,
                           type: "manufacturing_completion",
                           is_public: false,
                           timeline: timelineRef,
                           time_created: serverTimestamp(),
                           time_updated: serverTimestamp(),
                       };
                       if (user) {
                           entryData.user = doc(db, "users", user.uid);
                       }
                       await addDoc(collection(db, "timeline_entries"), entryData);
                   }
               }
           }
           
           await alert("Production complete! Inventory updated.");
           
      } catch (err: any) {
          console.error("Error completing production:", err);
          await alert("Error: " + err.message);
      } finally {
          setIsCompleting(false);
      }
  };
  
  // Calculate steps progress
  const completedCount = order?.steps?.filter(s => s.is_completed).length || 0;
  const totalCount = order?.steps?.length || 0;
  const stepsProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  
  // Calculate picking progress
  const pickedCount = bomItems.filter(i => i.is_picked).length || 0;
  const totalPickingCount = bomItems.length || 0;
  const pickingProgress = totalPickingCount === 0 ? 0 : Math.round((pickedCount / totalPickingCount) * 100);
  
  // Check if ready to produce (all steps done)
  const isReadyToProduce = stepsProgress === 100 && order?.status !== 'completed';

  if (loading) return <div className="p-8">Loading...</div>;
  if (!order) return <div className="p-8">Order not found.</div>;

  return (
    <div className="flex flex-col space-y-6 p-8 w-full max-w-[1600px] mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
             <h1 className="text-2xl font-bold">
                 {order.number ? `MO #${order.number}` : "Manufacturing Order"}
             </h1>
             <div className="flex items-center gap-2 text-muted-foreground text-sm">
                 <span className="font-medium text-foreground">{order.product_name || "Unnamed Product"}</span>
                 <span>•</span>
                 <span className="font-mono text-xs">ID: {order.id.slice(0, 8)}</span>
             </div>
        </div>
        
        <Button variant="outline" className="text-sm px-3 py-1 h-auto rounded-full cursor-default" size="sm" asChild>
           <div>
              {order.status === 'not_started' && <CircleDashed className="w-4 h-4 mr-2 text-slate-500" />}
              {order.status === 'in_progress' && <CircleDashed className="w-4 h-4 mr-2 text-blue-500" />}
              {order.status === 'completed' && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
              <span className="capitalize">{order.status?.replace('_', ' ') || 'Not Started'}</span>
           </div>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Left Pane: BOM (Picking) */}
        <Card className="flex flex-col h-full overflow-hidden">
             <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" /> Picking List (BOM)
                </CardTitle>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">Picked: {pickingProgress}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1 w-full">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pickingProgress}%` }} />
                </div>
             </CardHeader>
             <CardContent className="flex-1 overflow-y-auto p-0 border-t">
                {loadingBOM ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div> : (
                    <div className="divide-y">
                        {bomItems.map((item, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => !isLocked && toggleBOMItemPicked(idx)}
                                className={`p-4 flex items-center justify-between ${isLocked ? 'opacity-80' : 'hover:bg-muted/10 cursor-pointer'} group`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex-shrink-0 transition-colors ${item.is_picked ? 'text-primary' : (isLocked ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-primary')}`}>
                                        {item.is_picked ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <div className={`font-medium text-sm ${item.is_picked ? 'line-through text-muted-foreground' : ''}`}>
                                            {item.productName}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                             <Badge variant="outline" className="text-xs">Need: {item.qty}</Badge>
                                             <span className={`text-xs px-1.5 py-0.5 rounded ${item.currentQty >= item.qty ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                 Stock: {item.currentQty}
                                             </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    {item.currentQty < item.qty ? (
                                        <div className="text-red-500 text-xs font-semibold flex items-center">
                                            <X className="h-4 w-4 mr-1" /> Missing
                                        </div>
                                    ) : (
                                        <div className="text-green-500 text-xs font-semibold flex items-center">
                                            <Check className="h-4 w-4 mr-1" /> Available
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {bomItems.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No Bill of Materials found for this product template or order specific BOM.
                            </div>
                        )}
                    </div>
                )}
             </CardContent>
        </Card>

        {/* Right Pane: Process Steps */}
        <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <PackageCheck className="h-5 w-5" /> Manufacturing Steps
                </CardTitle>
                 <div className="flex justify-between items-center mt-2">
                     <span className="text-xs text-muted-foreground">Complete: {stepsProgress}%</span>
                 </div>
                 <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1 w-full">
                     <div className="h-full bg-primary transition-all duration-500" style={{ width: `${stepsProgress}%` }} />
                 </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 border-t">
                        <div className="space-y-3">
                            {order.steps?.map((step, idx) => (
                                <div 
                                    key={step.id ? `${step.id}-${idx}` : `step-${idx}`} 
                                    onClick={() => !isLocked && toggleStep(idx)}
                                    className={`border rounded-lg p-3 group transition-all bg-card ${isLocked ? 'opacity-80' : 'hover:border-primary/50 cursor-pointer'}`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className={`mt-1 flex-shrink-0 transition-colors ${step.is_completed ? 'text-primary' : (isLocked ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-primary')}`}>
                                            {step.is_completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                        </div>
                                        
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <div className="flex justify-between">
                                                <p className={`text-sm font-medium break-words pt-1 ${step.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                                    {step.description}
                                                </p>
                                            </div>
                                            
                                            {/* Note Area */}
                                            {(expandedNotes.has(`note-${idx}`) || (step.notes && step.notes.trim().length > 0)) && (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Textarea 
                                                        placeholder={isLocked ? "No notes added." : "Add notes..."} 
                                                        className="text-xs min-h-[60px] resize-none bg-muted/30 focus:bg-background transition-colors mt-2 disabled:opacity-75 disabled:cursor-not-allowed"
                                                        value={step.notes || ""}
                                                        disabled={isLocked}
                                                        onChange={(e) => updateStepNotes(idx, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {!isLocked && (
                                            <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => toggleNotes(idx, e)}
                                                    title={expandedNotes.has(`note-${idx}`) ? "Hide Note" : "Add Note"}
                                                >
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                </Button>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteStep(idx); }}
                                                    title="Delete Step"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!order.steps || order.steps.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                                    No steps added yet.
                                </div>
                            )}
                        </div>
            </CardContent>
            
            <div className="p-3 border-t bg-background">
                <div className="flex space-x-2">
                    <Input 
                        placeholder={isLocked ? "Cannot add steps to completed order" : "Add step..."} 
                        value={newStepDesc}
                        onChange={(e) => setNewStepDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                        className="h-9 text-sm disabled:cursor-not-allowed"
                        disabled={isLocked}
                    />
                    <Button onClick={handleAddStep} size="sm" disabled={isLocked}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 border-t bg-muted/10">
                 {isLocked ? (
                     <div className="text-center text-xs font-medium text-green-600 flex items-center justify-center gap-2">
                         <CheckCircle2 className="w-4 h-4" /> Order has been completed and is locked.
                     </div>
                 ) : isReadyToProduce ? (
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleProduce} disabled={isCompleting}>
                        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
                        Complete Order
                    </Button>
                 ) : (
                     <div className="text-center text-xs text-muted-foreground">
                         Complete all steps to finalize production.
                     </div>
                 )}
            </div>
        </Card>
      </div>

      {/* Legacy/Bottom section kept minimalistic/hidden or repurposed - Clearing old layout code by not rendering it */}
    </div>
  );
}
