"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  Package, 
  Search, 
  MoreHorizontal, 
  AlertTriangle, 
  ExternalLink,
  Loader2
} from 'lucide-react';

const InventoryManager = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Setup the query (sorting by item name by default)
    const q = query(collection(db, "products"), orderBy("item", "asc"));

    // 2. Start the real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInventory(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Filter logic for the search bar
  const filteredInventory = inventory.filter(item => 
    item.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serial?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by item or serial number..."
            className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-black outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
          {filteredInventory.length} Items Found
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
              <th className="px-6 py-4">Product Details</th>
              <th className="px-6 py-4">Serial Number</th>
              <th className="px-6 py-4">Inventory Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.item}</div>
                      <div className="text-xs text-slate-500">{item.category || 'Uncategorized'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-600 bg-slate-50/50">
                  {item.serial || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-slate-700 w-16">{item.quantity} units</span>
                    <StockBadge qty={item.quantity} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-md transition-all text-slate-400 hover:text-black">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredInventory.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p>No inventory items match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for status visualization
const StockBadge = ({ qty }: { qty: number }) => {
  if (qty <= 0) return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-[11px] font-bold uppercase tracking-wider">
      <AlertTriangle size={12} /> Out of Stock
    </span>
  );
  if (qty <= 5) return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold uppercase tracking-wider">
      Low Stock
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
      Healthy
    </span>
  );
};

export default InventoryManager;