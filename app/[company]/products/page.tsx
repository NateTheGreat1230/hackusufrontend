"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, doc } from 'firebase/firestore';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  ExternalLink,
  Loader2,
  X,
  Plus
} from 'lucide-react';

// 1. Updated Interface to match your new schema
interface Product {
  id: string;
  name: string;
  model_number: string;
  sku: string;
  upc: string;
  category: string;
  type: string;
  description: string;
  image: string;
  qty: number;
  qty_avail: number;
  price: number;
  cost: number;
  company?: any; // Firestore reference
  product_instances?: any[]; // Array of references
  time_created?: any;
  time_updated?: any;
}

const initialFormState = {
  name: "", model_number: "", sku: "", upc: "", category: "Motherboards", type: "Good",
  description: "", image: "", qty: 0, qty_avail: 0, price: 0, cost: 0, companyId: ""
};

const InventoryManager = () => {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Syncing with Firestore...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-800">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="text-blue-600" />
            My Products
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track your inventory in real-time.</p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-lg font-medium shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by name, model, or SKU..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Product Info</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Category</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Pricing</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Available Stock</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Model: {item.model_number}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{item.category}</td>
                    <td className="p-4 text-sm text-slate-600">${item.price?.toFixed(2)}</td>
                    <td className="p-4">
                      <StockBadge qty={item.qty_avail} />
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedProduct(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                      >
                        <ExternalLink size={16} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Details Modal (Unchanged structurally, just updated fields to match schema) */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">Product Details</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-500">Name</span>
                <span className="col-span-2 text-sm font-semibold text-slate-900">{selectedProduct.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-500">Model</span>
                <span className="col-span-2 text-sm text-slate-700">{selectedProduct.model_number}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-500">SKU</span>
                <span className="col-span-2 text-sm font-mono text-slate-700">{selectedProduct.sku}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-500">Financials</span>
                <span className="col-span-2 text-sm text-slate-700">Cost: ${selectedProduct.cost} | Price: ${selectedProduct.price}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 items-center">
                <span className="text-sm font-medium text-slate-500">Avail. Stock</span>
                <div className="col-span-2">
                   <StockBadge qty={selectedProduct.qty_avail} />
                   <span className="ml-2 text-xs text-slate-500">({selectedProduct.qty_avail} of {selectedProduct.qty} total)</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm font-medium text-slate-500">Database ID</span>
                <span className="col-span-2 text-xs font-mono text-slate-400 break-all">{selectedProduct.id}</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedProduct(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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