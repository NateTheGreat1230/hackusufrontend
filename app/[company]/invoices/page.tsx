"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { 
  FileText, 
  Search, 
  ExternalLink,
  Loader2,
  X,
  Plus,
  Edit,
  CheckCircle,
  Clock
} from 'lucide-react';

// 1. Interface matching your Firestore schema
interface Invoice {
  id: string;
  amount: number;
  amount_due: number;
  company?: any; // Reference
  customer?: any; // Reference
  project?: any; // Reference
  timeline?: any; // Reference
  line_items?: any[]; // Array of References
  transactions?: any[]; // Array of References
  time_created?: any; // Timestamp
  time_updated?: any; // Timestamp
}

// Helper to safely get an ID from a Firestore Reference
const getRefId = (ref: any) => (ref?.id ? ref.id : "");

const initialFormState = {
  id: "",
  amount: 0,
  amount_due: 0,
  companyId: "",
  customerId: "",
  projectId: "",
  timelineId: "",
};

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Sorting by time_created descending puts newest invoices at the top
    const q = query(collection(db, "invoices"), orderBy("time_created", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(initialFormState);
    setIsFormModalOpen(true);
  };

  const openEditModal = (invoice: Invoice) => {
    // Populate form with existing data, extracting IDs from references
    setFormData({
      id: invoice.id,
      amount: invoice.amount || 0,
      amount_due: invoice.amount_due || 0,
      companyId: getRefId(invoice.company),
      customerId: getRefId(invoice.customer),
      projectId: getRefId(invoice.project),
      timelineId: getRefId(invoice.timeline),
    });
    setIsFormModalOpen(true);
  };

  // 2. Handle both Add and Edit in one function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date();
      
      // Prepare the update payload
      const invoiceData: any = {
        amount: Number(formData.amount),
        amount_due: Number(formData.amount_due),
        company: formData.companyId ? doc(db, 'companies', formData.companyId) : null,
        customer: formData.customerId ? doc(db, 'customers', formData.customerId) : null,
        project: formData.projectId ? doc(db, 'projects', formData.projectId) : null,
        timeline: formData.timelineId ? doc(db, 'timelines', formData.timelineId) : null,
        time_updated: now
      };

      if (formData.id) {
        // Edit existing invoice
        const docRef = doc(db, "invoices", formData.id);
        await updateDoc(docRef, invoiceData);
      } else {
        // Add new invoice
        invoiceData.time_created = now;
        invoiceData.line_items = []; // Initialize empty array
        invoiceData.transactions = []; // Initialize empty array
        await addDoc(collection(db, "invoices"), invoiceData);
      }
      
      setIsFormModalOpen(false);
      setFormData(initialFormState);
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Failed to save invoice. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search by Invoice ID or Customer ID
  const filteredInvoices = invoices.filter(inv => 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRefId(inv.customer).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading Invoices...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-800">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="text-blue-600" />
            Invoices
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage billing, payments, and client accounts.</p>
        </div>
        
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-lg font-medium shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by Invoice ID or Customer ID..." 
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
                <th className="p-4 font-semibold text-slate-600 text-sm">Invoice ID</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Customer Ref</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Amount</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-sm text-slate-700">{invoice.id}</td>
                    <td className="p-4 text-sm font-mono text-slate-500">{getRefId(invoice.customer) || "N/A"}</td>
                    <td className="p-4 text-sm font-medium text-slate-800">
                      ${invoice.amount?.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <PaymentBadge amountDue={invoice.amount_due} />
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openEditModal(invoice)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex items-center mr-2"
                        title="Edit Invoice"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center"
                        title="View Details"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-semibold text-lg text-slate-800">
                {formData.id ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Financials */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Total Amount ($)</label>
                  <input required type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount Due ($)</label>
                  <input required type="number" step="0.01" name="amount_due" value={formData.amount_due} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                {/* References */}
                <div className="space-y-1 md:col-span-2 mt-4 border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Reference IDs</h4>
                  <p className="text-xs text-slate-500 mb-4">Paste the document IDs below. They will be saved as Firestore References.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Company ID</label>
                  <input name="companyId" value={formData.companyId} onChange={handleInputChange} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="e.g. mWRyQMkC..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Customer ID</label>
                  <input name="customerId" value={formData.customerId} onChange={handleInputChange} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="e.g. u7yowdf..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Project ID</label>
                  <input name="projectId" value={formData.projectId} onChange={handleInputChange} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="e.g. Lzxi85I..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Timeline ID</label>
                  <input name="timelineId" value={formData.timelineId} onChange={handleInputChange} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="e.g. lGds9nv..." />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                  {formData.id ? 'Save Changes' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">Invoice Details</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Invoice ID</p>
                  <p className="font-mono text-sm text-slate-900 mt-1">{selectedInvoice.id}</p>
                </div>
                <PaymentBadge amountDue={selectedInvoice.amount_due} />
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Amount</p>
                  <p className="text-lg font-semibold text-slate-900">${selectedInvoice.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Amount Due</p>
                  <p className="text-lg font-semibold text-red-600">${selectedInvoice.amount_due?.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">References</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-medium text-slate-500">Customer:</span>
                  <span className="col-span-2 font-mono text-slate-700 text-xs break-all">{getRefId(selectedInvoice.customer) || "None"}</span>
                  
                  <span className="font-medium text-slate-500">Company:</span>
                  <span className="col-span-2 font-mono text-slate-700 text-xs break-all">{getRefId(selectedInvoice.company) || "None"}</span>
                  
                  <span className="font-medium text-slate-500">Project:</span>
                  <span className="col-span-2 font-mono text-slate-700 text-xs break-all">{getRefId(selectedInvoice.project) || "None"}</span>
                  
                  <span className="font-medium text-slate-500">Timeline:</span>
                  <span className="col-span-2 font-mono text-slate-700 text-xs break-all">{getRefId(selectedInvoice.timeline) || "None"}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setSelectedInvoice(null);
                  openEditModal(selectedInvoice);
                }} 
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors text-sm flex items-center gap-1"
              >
                <Edit size={14} /> Edit
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for Payment Status
const PaymentBadge = ({ amountDue }: { amountDue: number }) => {
  if (amountDue <= 0) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
      <CheckCircle size={12} /> Paid
    </span>
  );
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold uppercase tracking-wider">
      <Clock size={12} /> Pending (${amountDue.toFixed(2)})
    </span>
  );
};

export default InvoiceManager;