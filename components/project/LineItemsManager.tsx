import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, List, Package, Search, Edit2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductInstance, Product } from "@/types";

interface LineItemsManagerProps {
  companyId: string;
  projectId: string;
  projectData: any;
  logEvent?: (note: string, type?: string, isPublic?: boolean) => Promise<void>;
}

export function LineItemsManager({ companyId, projectId, projectData, logEvent }: LineItemsManagerProps) {
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);
  const [draftDeposit, setDraftDeposit] = useState<number>(0);
  const [productSearch, setProductSearch] = useState("");

  // Fetch Line Items
  useEffect(() => {
    if (!projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const q = query(collection(db, "product_instances"), where("project", "==", projectRef));
    
    const unsubscribe = onSnapshot(q, async (snap) => {
      const items = snap.docs.map(docSnap => ({ id: docSnap.id, db_qty: docSnap.data().qty, db_price: docSnap.data().price, ...docSnap.data() } as any));
      
      const itemsWithProductRef = await Promise.all(items.map(async (item) => {
        if (!item.product) return item;
        return new Promise<any>((resolve) => {
           onSnapshot(
             typeof item.product === 'string' ? doc(db, item.product) : item.product,
             (prodSnap: any) => {
                if (prodSnap.exists()) {
                  resolve({ ...item, productData: { id: prodSnap.id, ...prodSnap.data() } });
                } else {
                  resolve(item);
                }
             }
           );
        });
      }));
      setLineItems(itemsWithProductRef);
    });

    return () => unsubscribe();
  }, [projectId]);

  // Fetch Available Base Products to add as an instance
  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAvailableProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    return () => unsubscribe();
  }, []);

  const enterEditMode = () => {
    setDraftItems([...lineItems]);
    setDraftDeposit(projectData?.deposit_required || 0);
    setRemovedItemIds([]);
    setProductSearch("");
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
  };

  const handleAddProductToDraft = (product: Product) => {
    const newItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      product: doc(db, "products", product.id),
      productData: product,
      qty: 1,
      price: product.price || 0,
    };
    setDraftItems([...draftItems, newItem]);
    setProductSearch("");
  };

  const handleRemoveDraftItem = (id: string) => {
    if (!id.startsWith("temp_")) {
      setRemovedItemIds([...removedItemIds, id]);
    }
    setDraftItems(draftItems.filter(i => i.id !== id));
  };

  const handleUpdateDraftItem = (id: string, field: string, value: number) => {
    setDraftItems(draftItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const saveChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    let summary: string[] = [];
    const projectRef = doc(db, "projects", projectId);
    
    // Process Removals
    for (const id of removedItemIds) {
      const originalItem = lineItems.find(i => i.id === id);
      if (originalItem) {
        await deleteDoc(doc(db, "product_instances", id));
        summary.push(`Removed ${originalItem.productData?.name || 'item'}`);
      }
    }

    let finalItems = [];

    // Process Updates and Additions
    for (const item of draftItems) {
      if (item.id.startsWith("temp_")) {
        // Add new
        const companyRef = doc(db, "companies", companyId);
        const newItemData = {
          company: companyRef,
          project: projectRef,
          product: item.product,
          qty: item.qty,
          price: item.price,
          status: "available",
          time_created: serverTimestamp(),
          time_updated: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "product_instances"), newItemData);
        summary.push(`Added ${item.qty}x ${item.productData?.name} at $${item.price.toFixed(2)}`);
        finalItems.push({ ...item, id: docRef.id });
      } else {
        // Check update
        const originalItem = lineItems.find(i => i.id === item.id);
        const origQty = originalItem?.db_qty || 1;
        const origPrice = originalItem?.db_price !== undefined ? originalItem.db_price : (originalItem?.productData?.price || 0);
        
        if (originalItem && (item.qty !== origQty || item.price !== origPrice)) {
          await updateDoc(doc(db, "product_instances", item.id), {
            qty: item.qty,
            price: item.price,
            time_updated: serverTimestamp()
          });
          
          let changes = [];
          if (item.qty !== origQty) changes.push(`Quantity: ${origQty} ➔ ${item.qty}`);
          if (item.price !== origPrice) changes.push(`Price: $${origPrice.toFixed(2)} ➔ $${item.price.toFixed(2)}`);
          summary.push(`Updated ${item.productData?.name} (${changes.join(", ")})`);
        }
        finalItems.push(item);
      }
    }

    const origDeposit = projectData?.deposit_required || 0;
    if (draftDeposit !== origDeposit) {
      summary.push(`Updated Required Deposit: $${origDeposit.toFixed(2)} ➔ $${draftDeposit.toFixed(2)}`);
    }

    if (summary.length > 0) {
      const newTotal = finalItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
      
      const currentStatus = projectData?.status || 'draft';
      
      await updateDoc(projectRef, {
        amount: newTotal,
        cost: newTotal,
        amount_due: newTotal,
        deposit_required: draftDeposit,
        status: currentStatus,
        approved: false,
        rejected: false
      });

      if (logEvent) {
        await logEvent(`Updated Project Line Items:\n• ${summary.join('\n• ')}\n\nNew total is $${newTotal.toFixed(2)}. Approval reset to pending.`, "line_items_update", true);
      }
    }

    setIsSaving(false);
    setIsEditMode(false);
  };

  const filteredProducts = availableProducts.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const displayItems = isEditMode ? draftItems : lineItems;
  const totalAmount = displayItems.reduce((acc, curr) => acc + (curr.qty * (curr.price !== undefined ? curr.price : (curr.productData?.price || 0))), 0);
  const depositRequired = isEditMode ? draftDeposit : (projectData?.deposit_required || 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Line Items
        </CardTitle>
        {!isEditMode ? (
          <Button size="sm" onClick={enterEditMode} className="cursor-pointer">
            <Edit2 className="w-4 h-4 mr-2" /> Edit Items
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={cancelEditMode} disabled={isSaving} className="cursor-pointer">
              Cancel
            </Button>
            <Button size="sm" onClick={saveChanges} disabled={isSaving} className="cursor-pointer">
              {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Done</>}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditMode && (
          <div className="bg-muted/30 p-4 rounded-lg border mb-4 space-y-4">
            <div className="flex items-center gap-2 relative">
               <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
               <Input 
                 placeholder="Search products by name or SKU to add..." 
                 className="pl-9 bg-background focus-visible:ring-1" 
                 value={productSearch}
                 onChange={(e) => setProductSearch(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && filteredProducts.length > 0) {
                     e.preventDefault();
                     handleAddProductToDraft(filteredProducts[0]);
                   }
                 }}
                 autoFocus
               />
            </div>
            
            {productSearch.trim().length > 0 && (
              <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-1 bg-background shadow-sm">
                {filteredProducts.length === 0 ? (
                  <div className="text-sm text-center py-4 text-muted-foreground">No products found.</div>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <div 
                       key={p.id} 
                       className={`flex justify-between items-center p-2 rounded hover:bg-muted cursor-pointer ${idx === 0 ? 'bg-muted/50' : ''}`}
                       onClick={() => handleAddProductToDraft(p)}
                    >
                      <div>
                        <div className="text-sm font-medium">{p.name || 'Unnamed Product'}</div>
                        <div className="text-xs text-muted-foreground">{p.sku || 'No SKU'}</div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="text-sm font-medium">${p.price?.toFixed(2) || '0.00'}</div>
                        <Button size="sm" variant="secondary" className="h-7 text-xs cursor-pointer">Add</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {displayItems.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              <Package className="w-10 h-10 mb-3 text-muted/50" />
              <p>{isEditMode ? "No line items drafted." : "No line items exist yet."}</p>
           </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="font-medium p-3">Product</th>
                  <th className="font-medium p-3 w-24">Qty</th>
                  <th className="font-medium p-3 w-32">Price</th>
                  <th className="font-medium p-3 text-right">Line Total</th>
                  {isEditMode && <th className="font-medium p-3 w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayItems.map((item, idx) => {
                   const itemPrice = item.price !== undefined ? item.price : (item.productData?.price || 0);
                   return (
                    <tr key={item.id || idx} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{item.productData?.name || 'Unknown Product'}</div>
                        <div className="text-xs text-muted-foreground">{item.productData?.sku || 'No SKU'}</div>
                      </td>
                      <td className="p-3">
                        {isEditMode ? (
                          <input 
                             className="w-full text-sm flex h-8 rounded-md border border-input bg-background px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                             type="number"
                             min="1"
                             value={item.qty || 1}
                             onChange={(e) => handleUpdateDraftItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                          />
                        ) : (
                          <span>{item.qty || 1}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditMode ? (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">$</span>
                            <input 
                               className="w-full text-sm flex h-8 rounded-md border border-input bg-background px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                               type="number"
                               step="0.01"
                               value={itemPrice}
                               onChange={(e) => handleUpdateDraftItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        ) : (
                          <span>${itemPrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ${((item.qty || 1) * itemPrice).toFixed(2)}
                      </td>
                      {isEditMode && (
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 cursor-pointer" onClick={() => handleRemoveDraftItem(item.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 border-t pt-4 space-y-2">
           <div className="flex justify-between items-center text-sm font-medium">
             <span className="text-muted-foreground text-base">Total Amount</span>
             <span className="text-lg">${totalAmount.toFixed(2)}</span>
           </div>
           <div className="flex justify-between items-center text-sm font-medium">
             <span className="text-muted-foreground text-base">Deposit Required</span>
             {isEditMode ? (
               <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <input 
                    className="w-24 text-right text-sm h-8 rounded-md border border-input bg-background px-2 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    type="number"
                    step="0.01"
                    min="0"
                    value={draftDeposit}
                    onChange={(e) => setDraftDeposit(parseFloat(e.target.value) || 0)}
                  />
               </div>
             ) : (
               <span className="text-lg">${depositRequired.toFixed(2)}</span>
             )}
           </div>
           <div className="flex justify-between items-center text-sm font-bold pt-2 border-t">
             <span className="text-muted-foreground text-base">Amount Due</span>
             <span className="text-xl text-red-600">${(isEditMode ? totalAmount : (projectData?.amount_due ?? totalAmount)).toFixed(2)}</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
