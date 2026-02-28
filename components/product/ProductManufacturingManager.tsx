"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Product, BOMEntry, ManufacturingStepTemplate } from "@/types";
import { useDialog } from "@/lib/dialog-context";

interface ProductManufacturingManagerProps {
  product: Product;
  companyId: string;
}

export function ProductManufacturingManager({ product, companyId }: ProductManufacturingManagerProps) {
  const [isManufactured, setIsManufactured] = useState(product.is_manufactured || false);
  const { alert } = useDialog();
  const [bom, setBom] = useState<BOMEntry[]>(product.bom || []);
  const [steps, setSteps] = useState<ManufacturingStepTemplate[]>(product.manufacturing_steps || []);
  const [templateId, setTemplateId] = useState<string>(product.manufacturing_template_id || "custom");
  
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // BOM Form State
  const [selectedBOMProduct, setSelectedBOMProduct] = useState("");
  const [bomQty, setBomQty] = useState(1);

  // Step Form State
  const [newStepDesc, setNewStepDesc] = useState("");

  useEffect(() => {
    if (isManufactured) {
      setLoadingProducts(true);
      const fetchData = async () => {
          // Products
          const qProd = query(collection(db, "products"));
          const snapProd = await getDocs(qProd);
          const prods = snapProd.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
          setAvailableProducts(prods.filter(p => p.id !== product.id));

          // Templates
          const qTempl = query(collection(db, "manufacturing_templates"));
          const snapTempl = await getDocs(qTempl);
          setAvailableTemplates(snapTempl.docs.map(d => ({ id: d.id, ...d.data() })));
          
          setLoadingProducts(false);
      };
      
      // Only fetch if we haven't already
      if (availableProducts.length === 0) {
        fetchData();
      } else {
        setLoadingProducts(false);
      }
    }
  }, [isManufactured, product.id]);

  const handleTemplateChange = (val: string) => {
      setTemplateId(val);
      if (val === 'custom') {
          // Keep existing steps
      } else {
          const tmpl = availableTemplates.find(t => t.id === val);
          if (tmpl && tmpl.steps) {
              setSteps(tmpl.steps);
          }
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "products", product.id), {
        is_manufactured: isManufactured,
        bom: isManufactured ? bom : [],
        manufacturing_steps: isManufactured ? steps : []
      });
    } catch (error) {
      console.error("Error saving manufacturing settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addBOMItem = async () => {
    if (!selectedBOMProduct || bomQty <= 0) return;
    
    // Check if already exists
    if (bom.some(b => typeof b.product === 'string' ? b.product === selectedBOMProduct : b.product.id === selectedBOMProduct)) {
        await alert("Product already in BOM");
        return;
    }

    const newEntry: BOMEntry = {
      product: doc(db, "products", selectedBOMProduct),
      qty: bomQty
    };
    
    setBom([...bom, newEntry]);
    setSelectedBOMProduct("");
    setBomQty(1);
  };

  const removeBOMItem = (index: number) => {
    const newBom = [...bom];
    newBom.splice(index, 1);
    setBom(newBom);
  };

  const addStep = () => {
    if (!newStepDesc.trim()) return;
    setSteps([...steps, { description: newStepDesc }]);
    setNewStepDesc("");
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };
  
  // Helper to get product name from reference or ID
  const getProductName = (refOrId: any) => {
      const id = typeof refOrId === 'string' ? refOrId : refOrId.id;
      const prod = availableProducts.find(p => p.id === id);
      return prod ? prod.name : id;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Manufacturing Settings
                </CardTitle>
                <CardDescription>
                    Configure if this product is manufactured, its Bill of Materials, and process steps.
                </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    checked={isManufactured} 
                    onCheckedChange={setIsManufactured} 
                />
                <Label>Is Manufactured?</Label>
            </div>
        </div>
      </CardHeader>
      {isManufactured && (
        <CardContent className="space-y-6">
          {/* Bill of Materials Section */}
          <div className="space-y-4 border p-4 rounded-md bg-muted/20">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Bill of Materials (BOM)</h3>
            
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                    <Label className="text-xs">Component Product</Label>
                    <Select value={selectedBOMProduct} onValueChange={setSelectedBOMProduct}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select component..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableProducts.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-24 space-y-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input 
                        type="number" 
                        min="1" 
                        value={bomQty} 
                        onChange={(e) => setBomQty(Number(e.target.value))} 
                    />
                </div>
                <Button onClick={addBOMItem} size="icon" className="mb-0.5">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
                {bom.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-background p-2 rounded border text-sm">
                        <span>{getProductName(item.product)}</span>
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-xs">x{item.qty}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeBOMItem(idx)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ))}
                {bom.length === 0 && <div className="text-center text-xs text-muted-foreground py-2">No components added.</div>}
            </div>
          </div>

          {/* Manufacturing Steps Section */}
          <div className="space-y-4 border p-4 rounded-md bg-muted/20">
            <div className="flex justify-between items-center">
                 <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Manufacturing Process</h3>
                 <div className="w-[200px]">
                     <Select value={templateId} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="h-8 text-xs">
                             <SelectValue placeholder="Select Template" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="custom">Custom Steps</SelectItem>
                             {availableTemplates.map(t => (
                                 <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                             ))}
                        </SelectContent>
                     </Select>
                 </div>
            </div>
            
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                    <Label className="text-xs">Step Description</Label>
                    <Input 
                        placeholder="e.g. Assemble chassis..." 
                        value={newStepDesc}
                        onChange={(e) => setNewStepDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addStep()}
                    />
                </div>
                <Button onClick={addStep} size="icon" className="mb-0.5">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

             <div className="space-y-2 max-h-40 overflow-y-auto">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-background p-2 rounded border text-sm">
                        <div className="flex items-start gap-2">
                            <span className="font-mono text-muted-foreground text-xs pt-0.5">{idx + 1}.</span>
                            <span>{step.description}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStep(idx)}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
                 {steps.length === 0 && <div className="text-center text-xs text-muted-foreground py-2">No steps defined.</div>}
            </div>
          </div>

          <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Save Manufacturing Settings
              </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
