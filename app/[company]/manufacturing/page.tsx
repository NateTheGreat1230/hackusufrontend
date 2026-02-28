"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, query, onSnapshot, orderBy, where, getDocs, addDoc, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ManufacturingOrder, Project, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Plus, Loader2, Settings } from "lucide-react";
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

export default function ManufacturingPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;

  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProductTemplate, setSelectedProductTemplate] = useState("");
  const [productName, setProductName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manufacturedProducts, setManufacturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "manufacturing_orders"),
      orderBy("time_created", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ManufacturingOrder[];
      setOrders(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [company]);

  // Fetch Projects for the dropdown
  useEffect(() => {
    if (isCreateOpen) {
      const fetchProjects = async () => {
        const q = query(collection(db, "projects")); 
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
        setProjects(results);
        
        // Fetch manufactured products
        const prodQ = query(collection(db, "products"), where("is_manufactured", "==", true));
        const prodSnap = await getDocs(prodQ);
        const prodResults = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
        setManufacturedProducts(prodResults);
      };
      fetchProjects();
    }
  }, [isCreateOpen]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !productName) return;

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
                project: doc(db, "projects", selectedProjectId),
                product_ref: selectedProductTemplate && selectedProductTemplate !== 'none' ? doc(db, "products", selectedProductTemplate) : null,
                product_name: productName,
                status: "not_started",
                steps: [],
                time_created: serverTimestamp(),
                time_updated: serverTimestamp(),
                company: doc(db, "companies", company) 
            });

            return newOrderRef.id;
        });
      
      setIsCreateOpen(false);
      setProductName("");
      setSelectedProjectId("");
      router.push(`/${company}/manufacturing/${newOrderId}`);
    } catch (error) {
      console.error("Error creating order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Order #",
      key: "number",
      render: (item: ManufacturingOrder) => <span className="font-mono text-sm">{item.number ? `MO-${item.number}` : item.id.slice(0,8)}</span>
    },
    {
      header: "Product Name",
      key: "product_name",
      render: (item: ManufacturingOrder) => <span className="font-medium">{item.product_name || `MO #${item.number}`}</span>
    },
    {
      header: "Status",
      key: "status",
      render: (item: ManufacturingOrder) => (
        <span className={`capitalize px-2 py-1 rounded text-xs ${
          item.status === 'completed' ? 'bg-green-100 text-green-800' :
          item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.status?.replace('_', ' ') || "Not Started"}
        </span>
      )
    },
    {
      header: "Project",
      key: "project",
      render: (item: ManufacturingOrder) => (
        <span className="text-muted-foreground text-sm">
           {item.project && typeof item.project === 'object' && item.project.id ? `Project ${item.project.id.slice(0, 6)}...` : "No Project"}
        </span>
      )
    },
    {
        header: "Date",
        key: "time_created", 
        render: (item: ManufacturingOrder) => item.time_created?.toDate().toLocaleDateString() || "-" 
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manufacturing</h2>
          <p className="text-muted-foreground">Manage manufacturing orders and processes.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/${company}/manufacturing/settings`)}>
                <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Order
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
              <div className="space-y-2">
                <Label>Link to Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.number ? `Project #${p.number}` : p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      </div>
      </div>

      <DataTable 
        columns={columns} 
        data={orders} 
        onRowClick={(item) => router.push(`/${company}/manufacturing/${item.id}`)}
      />
    </div>
  );
}
