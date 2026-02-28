import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, List, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductInstance, Product } from "@/types";

interface LineItemsManagerProps {
  companyId: string;
  projectId: string;
  projectData: any;
  logEvent?: (note: string, type?: string) => Promise<void>;
}

export function LineItemsManager({ companyId, projectId, projectData, logEvent }: LineItemsManagerProps) {
  const [lineItems, setLineItems] = useState<(ProductInstance & { productData?: Product })[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  // New item drafting state
  const [isAddMode, setIsAddMode] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [addedItemsThisSession, setAddedItemsThisSession] = useState<string[]>([]);
  
  // Fetch Line Items
  useEffect(() => {
    if (!projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const q = query(collection(db, "product_instances"), where("project", "==", projectRef));
    
    const unsubscribe = onSnapshot(q, async (snap) => {
      const items = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProductInstance));
      
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

  const updateProjectTotal = async (items: any[]) => {
     const total = items.reduce((acc, curr) => {
        const itemPrice = curr.price !== undefined ? curr.price : (curr.productData?.price || 0);
        return acc + (curr.qty * itemPrice);
     }, 0);

     const projectRef = doc(db, "projects", projectId);
     await updateDoc(projectRef, {
        amount: total,
        cost: total,
        amount_due: total // Just syncing it, real business logic might be different if multiple payments happen
     });
  }

  const handleAddProductDirectly = async (product: Product) => {
    if (!product || !companyId) return;
    
    const projectRef = doc(db, "projects", projectId);
    const productRef = doc(db, "products", product.id);
    const companyRef = doc(db, "companies", companyId);
    
    const newItem = {
      company: companyRef,
      project: projectRef,
      product: productRef,
      qty: 1,
      price: product.price || 0,
      status: "available",
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "product_instances"), newItem);

    // Create optimistic items array to get strict calc
    const optimisticItems = [...lineItems, { ...newItem, id: docRef.id, productData: product }];
    await updateProjectTotal(optimisticItems);

      if (logEvent) {
        await logEvent(`User added ${product.name || 'a product'} to the project.`, "line_items_add");
      }

      setProductSearch("");
    };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        handleAddProductDirectly(filteredProducts[0]);
      }
    }
  };

  const handleUpdateLineItem = async (item: any, field: string, value: number) => {
      const originalValue = field === 'price' ? (item.price !== undefined ? item.price : (item.productData?.price || 0)) : (item.qty || 1);
      if (value === originalValue) return;

      const itemRef = doc(db, "product_instances", item.id);
      await updateDoc(itemRef, { [field]: value, time_updated: serverTimestamp() });
      
      const updatedItems = lineItems.map(i => i.id === item.id ? { ...i, [field]: value } : i);
      await updateProjectTotal(updatedItems);
      
      const fieldName = field === "qty" ? "quantity" : "price";
      const formattedOld = field === "price" ? `$${originalValue.toFixed(2)}` : originalValue;
      const formattedNew = field === "price" ? `$${value.toFixed(2)}` : value;

      if (logEvent) {
         await logEvent(`User changed ${item.productData?.name || 'an item'}'s ${fieldName} from ${formattedOld} to ${formattedNew}.`, "line_items_update");
      }
  }
  
  const handleRemoveLineItem = async (item: any) => {
     if (!confirm("Are you sure you want to remove this item?")) return;
     await deleteDoc(doc(db, "product_instances", item.id));
     const remainder = lineItems.filter(i => i.id !== item.id);
     await updateProjectTotal(remainder);
       
       if (logEvent) {
          await logEvent(`User removed ${item.productData?.name || 'an item'} from the project.`, "line_items_remove");
       }
    };

    const filteredProducts = availableProducts.filter(p => 
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
      );

      const totalAmount = projectData?.amount || projectData?.cost || 0;
      const totalAmountDue = projectData?.amount_due || projectData?.amount || 0;

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Line Items
        </CardTitle>
        <Button size="sm" onClick={() => setIsAddMode(!isAddMode)} variant={isAddMode ? "outline" : "default"} className="cursor-pointer">
          {isAddMode ? <><X className="w-4 h-4 mr-2" /> Done</> : <><Plus className="w-4 h-4 mr-2" /> Add Items</>}
        </Button>
      </CardHeader>
      <CardContent>
        {isAddMode && (
          <div className="bg-muted/30 p-4 rounded-lg border mb-4 space-y-4">
            <div className="flex items-center gap-2 relative">
               <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
               <Input 
                 placeholder="Search products by name or SKU to add..." 
                 className="pl-9 bg-background focus-visible:ring-1" 
                 value={productSearch}
                 onChange={(e) => setProductSearch(e.target.value)}
                 onKeyDown={handleSearchKeyDown}
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
                       onClick={() => handleAddProductDirectly(p)}
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
            <div className="text-xs text-muted-foreground flex justify-between">
               <span>Tip: Press <strong>Enter</strong> to quickly add the first matching product.</span>
               <span>Items are added with default quantity 1.</span>
            </div>
          </div>
        )}

        {lineItems.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              <Package className="w-10 h-10 mb-3 text-muted/50" />
              <p>No line items exist yet.</p>
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
                  <th className="font-medium p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lineItems.map((item, idx) => {
                   const itemPrice = item.price !== undefined ? item.price : (item.productData?.price || 0);
                   return (
                    <tr key={item.id || idx} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{item.productData?.name || 'Unknown Product'}</div>
                        <div className="text-xs text-muted-foreground">{item.productData?.sku || 'No SKU'}</div>
                      </td>
                      <td className="p-3">
                        <input 
                           className="w-full text-sm flex h-8 rounded-md border border-input bg-transparent px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                           type="number"
                           min="1"
                           value={item.qty || 1}
                           onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[idx] = { ...newItems[idx], qty: parseInt(e.target.value) || 1 };
                              setLineItems(newItems); // Optimistic UI local change
                           }}
                            onBlur={(e) => handleUpdateLineItem(item, 'qty', parseInt(e.target.value) || 1)}
                            onKeyDown={(e) => e.key === 'Enter' ? handleUpdateLineItem(item, 'qty', parseInt(e.currentTarget.value) || 1) : null}
                        />
                      </td>
                      <td className="p-3">
                        <input 
                           className="w-full text-sm flex h-8 rounded-md border border-input bg-transparent px-2 py-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                           type="number"
                           step="0.01"
                           value={itemPrice}
                           onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[idx] = { ...newItems[idx], price: parseFloat(e.target.value) || 0 };
                              setLineItems(newItems);
                           }}
                            onBlur={(e) => handleUpdateLineItem(item, 'price', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => e.key === 'Enter' ? handleUpdateLineItem(item, 'price', parseFloat(e.currentTarget.value) || 0) : null}
                        />
                      </td>
                      <td className="p-3 text-right font-medium">
                        ${((item.qty || 1) * itemPrice).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 cursor-pointer" onClick={() => handleRemoveLineItem(item)}>
                            <X className="w-4 h-4" />
                        </Button>
                      </td>
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
             <span className="text-lg">${(totalAmount).toFixed(2)}</span>
           </div>
           <div className="flex justify-between items-center text-sm font-bold">
             <span className="text-muted-foreground text-base">Amount Due</span>
             <span className="text-xl text-red-600">${(totalAmountDue).toFixed(2)}</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
