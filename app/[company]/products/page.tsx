"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, doc } from 'firebase/firestore';
import { 
  Package, 
  AlertTriangle, 
  ExternalLink,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";

import { useRouter, useParams } from 'next/navigation';

import { DataTable } from "@/components/DataTable";
import { Product } from "@/types";

const initialFormState = {
  name: "", model_number: "", sku: "", upc: "", category: "Motherboards", type: "Good",
  description: "", image: "", qty: 0, qty_avail: 0, price: 0, cost: 0, companyId: ""
};

const InventoryManager = () => {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Note: Updated orderby to 'name' to match new schema
    const q = query(collection(db, "products"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setInventory(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Input Changes for the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 2. Submit Logic with References and Timestamps
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date();
      
      const newProductData = {
        name: formData.name,
        model_number: formData.model_number,
        sku: formData.sku,
        upc: formData.upc,
        category: formData.category,
        type: formData.type,
        description: formData.description,
        image: formData.image,
        // Convert string inputs to numbers
        qty: Number(formData.qty),
        qty_avail: Number(formData.qty_avail),
        price: Number(formData.price),
        cost: Number(formData.cost),
        // Convert the string ID into an actual Firestore Reference
        company: formData.companyId ? doc(db, 'companies', formData.companyId) : null,
        product_instances: [], // Start with empty array for a new product
        time_created: now,
        time_updated: now
      };

      await addDoc(collection(db, "products"), newProductData);
      
      // Reset and close
      setFormData(initialFormState);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to add product. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Product Info",
      key: "info",
      render: (item: Product) => (
        <div className="py-2">
          <p className="font-semibold">{item.name}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Model: {item.model_number}</p>
        </div>
      )
    },
    {
      header: "Category",
      key: "category",
      className: "py-2 text-sm"
    },
    {
      header: "Pricing",
      key: "price",
      className: "py-2 text-sm",
      render: (item: Product) => `$${item.price?.toFixed(2)}`
    },
    {
      header: "Available Stock",
      key: "qty_avail",
      className: "py-2",
      render: (item: Product) => <StockBadge qty={item.qty_avail || 0} />
    },
    {
      header: "Actions",
      key: "actions",
      className: "py-2 text-right",
      render: (item: Product) => (
        <Button 
          variant="ghost" 
          size="sm"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/${company}/product/${item.id}`);
          }}
        >
          <ExternalLink size={16} className="mr-1" />
          Details
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Syncing with Firestore...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-6 overflow-y-auto w-full">
        <div className="max-w-[98%] mx-auto space-y-4">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
                <Package className="text-blue-600" />
                Products
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage and track your inventory in real-time.</p>
            </div>
            
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Add Product</span>
            </Button>
          </div>

          <DataTable 
            columns={columns}
            data={inventory}
            searchPlaceholder="Search by name, model, or SKU..."
            searchKey={(item: Product) => `${item.name} ${item.model_number} ${item.sku}`}
            onRowClick={(item: Product) => router.push(`/${company}/product/${item.id}`)}
            emptyMessage="No products found matching your search."
          />

      {/* 3. NEW Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-semibold text-lg text-slate-800">Add New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Product Name</label>
                  <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. My Product MOBO" />
                </div>
                
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="A decent motherboard..." />
                </div>

                {/* Identifiers */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Model Number</label>
                  <input required name="model_number" value={formData.model_number} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ASUS TUF X470 WIFI" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">SKU</label>
                  <input required name="sku" value={formData.sku} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="blahdeblah" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">UPC</label>
                  <input required name="upc" value={formData.upc} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123451234512345" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Image URL</label>
                  <input required name="image" value={formData.image} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                </div>

                {/* Categorization */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <input required name="category" value={formData.category} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <input required name="type" value={formData.type} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                {/* Pricing & Stock */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Cost ($)</label>
                  <input required type="number" step="0.01" name="cost" value={formData.cost} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Price ($)</label>
                  <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Total Quantity</label>
                  <input required type="number" name="qty" value={formData.qty} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Quantity Available</label>
                  <input required type="number" name="qty_avail" value={formData.qty_avail} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                {/* Relations */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Company ID (Reference)</label>
                  <input required name="companyId" value={formData.companyId} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. mWRyQMkC6Abcrc7BXVeH" />
                  <p className="text-xs text-slate-500">Paste the document ID of the company. This will be saved as a Firestore Reference.</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </div>
    </div>
  );
}

// Helper component 
const StockBadge = ({ qty }: { qty: number }) => {
  if (qty <= 0) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-[11px] font-bold uppercase tracking-wider">
      <AlertTriangle size={12} /> Out of Stock
    </span>
  );
  if (qty <= 5) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold uppercase tracking-wider">
      Low Stock
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
      Healthy
    </span>
  );
};

export default InventoryManager;