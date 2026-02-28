"use client";

import { use, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pen, Check, X, Package, DollarSign, BarChart3, Hash, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBreadcrumbs } from "@/lib/breadcrumb-context";

export default function ProductPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = use(params);
  const router = useRouter();
  const { setCustomTitle } = useBreadcrumbs();

  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "products", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...(docSnap.data() as any) };
        setProductData(data);
        if (data.name) {
          setCustomTitle(data.name);
        } else {
          setCustomTitle("Unnamed Product");
        }
      } else {
        setProductData(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id, setCustomTitle]);

  const handleEditClick = () => {
    setEditForm({
      name: productData.name || "",
      category: productData.category || "",
      type: productData.type || "",
      description: productData.description || "",
      cost: productData.cost || 0,
      price: productData.price || 0,
      qty: productData.qty || 0,
      qty_avail: productData.qty_avail || 0,
      sku: productData.sku || "",
      upc: productData.upc || "",
      model_number: productData.model_number || "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, {
      name: editForm.name,
      category: editForm.category,
      type: editForm.type,
      description: editForm.description,
      cost: Number(editForm.cost) || 0,
      price: Number(editForm.price) || 0,
      qty: Number(editForm.qty) || 0,
      qty_avail: Number(editForm.qty_avail) || 0,
      sku: editForm.sku,
      upc: editForm.upc,
      model_number: editForm.model_number,
    });
    setIsEditing(false);
  };

  if (loading) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Loading product details...</div>;
  if (!productData) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Product not found or deleted.</div>;

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {productData.name || "Unnamed Product"}
              </h1>
              <p className="text-muted-foreground mt-1">Product Details</p>
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit} className="cursor-pointer">
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} className="cursor-pointer bg-green-600 hover:bg-green-700 text-white">
                    <Check className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={handleEditClick} variant="outline" className="cursor-pointer">
                  <Pen className="w-4 h-4 mr-2" /> Edit Product
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-xs font-medium text-muted-foreground">Product Name</label>
                        <Input 
                          value={editForm.name} 
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                        <Input 
                          value={editForm.category} 
                          onChange={(e) => setEditForm({...editForm, category: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                        <Input 
                          value={editForm.type} 
                          onChange={(e) => setEditForm({...editForm, type: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea 
                        className="min-h-[100px]"
                        value={editForm.description} 
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})} 
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Product Name</div>
                        <div className="font-medium">{productData.name || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Category</div>
                        <div className="font-medium">{productData.category || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Type</div>
                        <div className="font-medium">{productData.type || "-"}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                      <div className="whitespace-pre-wrap text-sm">{productData.description || "-"}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Cost</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editForm.cost} 
                        onChange={(e) => setEditForm({...editForm, cost: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Price</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editForm.price} 
                        onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Cost</div>
                      <div className="font-medium">${(productData.cost || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Price</div>
                      <div className="font-medium text-green-600">${(productData.price || 0).toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Total Qty</label>
                      <Input 
                        type="number"
                        value={editForm.qty} 
                        onChange={(e) => setEditForm({...editForm, qty: parseInt(e.target.value) || 0})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Available Qty</label>
                      <Input 
                        type="number"
                        value={editForm.qty_avail} 
                        onChange={(e) => setEditForm({...editForm, qty_avail: parseInt(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Total Qty</div>
                      <div className="font-medium">{productData.qty || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Available Qty</div>
                      <div className="font-medium">{productData.qty_avail || 0}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="w-5 h-5" /> Product Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">SKU</label>
                      <Input 
                        value={editForm.sku} 
                        onChange={(e) => setEditForm({...editForm, sku: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">UPC</label>
                      <Input 
                        value={editForm.upc} 
                        onChange={(e) => setEditForm({...editForm, upc: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Model Number</label>
                      <Input 
                        value={editForm.model_number} 
                        onChange={(e) => setEditForm({...editForm, model_number: e.target.value})} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">SKU</div>
                      <div className="font-medium">{productData.sku || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">UPC</div>
                      <div className="font-medium">{productData.upc || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Model Number</div>
                      <div className="font-medium">{productData.model_number || "-"}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
