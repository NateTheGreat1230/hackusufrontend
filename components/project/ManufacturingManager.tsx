import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, serverTimestamp, doc, runTransaction, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ManufacturingOrder, Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ManufacturingManagerProps {
  companyId: string;
  projectId: string;
}

export function ManufacturingManager({ companyId, projectId }: ManufacturingManagerProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductTemplate, setSelectedProductTemplate] = useState("");
  const [productName, setProductName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manufacturedProducts, setManufacturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isCreateOpen && manufacturedProducts.length === 0) {
      const fetchProducts = async () => {
        const prodQ = query(collection(db, "products"), where("is_manufactured", "==", true));
        const prodSnap = await getDocs(prodQ);
        const prodResults = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
        setManufacturedProducts(prodResults);
      };
      fetchProducts();
    }
  }, [isCreateOpen]);

  useEffect(() => {
    if (!projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const q = query(
      collection(db, "manufacturing_orders"), 
      where("project", "==", projectRef)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ManufacturingOrder[];
      results.sort((a, b: any) => {
        const da = a.time_created?.toMillis?.() || 0;
        const db = b.time_created?.toMillis?.() || 0;
        return db - da;
      });
      setOrders(results);
    });
    
    return () => unsubscribe();
  }, [projectId]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName) return;

    setIsSubmitting(true);
    try {
        const newOrderId = await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, "counters", "manufacturing_orders");
            const counterSnap = await transaction.get(counterRef);

            let newNumber = 1001;
            if (counterSnap.exists()) {
                const data = counterSnap.data();
                newNumber = (data.last_number || 1000) + 1;
            }

            transaction.set(counterRef, { last_number: newNumber }, { merge: true });

            const newOrderRef = doc(collection(db, "manufacturing_orders"));
            
            transaction.set(newOrderRef, {
                number: newNumber,
                project: doc(db, "projects", projectId),
                product_ref: selectedProductTemplate && selectedProductTemplate !== 'none' ? doc(db, "products", selectedProductTemplate) : null,
                product_name: productName,
                status: "not_started",
                steps: [],
                time_created: serverTimestamp(),
                time_updated: serverTimestamp(),
                company: doc(db, "companies", companyId)
            });

            return newOrderRef.id;
        });
        
        setIsCreateOpen(false);
        setProductName("");
        setSelectedProductTemplate("");
        router.push(`/${companyId}/manufacturing/${newOrderId}`);
    } catch (error) {
        console.error("Error creating manufacturing order:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            Manufacturing Orders
        </CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Add Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Manufacturing Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrder} className="space-y-4 py-4">
              <div className="space-y-2">
                 <Label>Select Product Template (Optional)</Label>
                 <Select value={selectedProductTemplate} onValueChange={(val) => {
                     setSelectedProductTemplate(val);
                     const prod = manufacturedProducts.find(p => p.id === val);
                     if (prod) setProductName(prod.name || "");
                 }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manufactured product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturedProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                    <SelectItem value="none">Custom / No Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order Name / Description</Label>
                <Input 
                  placeholder="e.g. Gaming PC Build"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 overflow-auto">
        {orders.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">No manufacturing orders yet.</div>
        )}
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer group border"
            onClick={() => router.push(`/${companyId}/manufacturing/${order.id}`)}
          >
            <div className="space-y-1">
              <div className="text-sm font-medium flex items-center">
                 {order.number ? `MO-${order.number}` : (order.product_name || "Unnamed Build")}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{order.steps?.filter(s => s.is_completed).length || 0} / {order.steps?.length || 0} steps</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {order.status === 'in_progress' ? 'In Progress' : order.status?.replace('_', ' ') || 'New'}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
