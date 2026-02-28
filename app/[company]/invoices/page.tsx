"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { 
  ExternalLink,
  Loader2,
  X,
  Plus,
  Edit,
  CheckCircle,
  Clock
} from 'lucide-react';

import { useSearchParams, useRouter, useParams } from 'next/navigation';

import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/types";
import { useDialog } from "@/lib/dialog-context";

// Helper to safely get an ID from a Firestore Reference
const getRefId = (ref: any) => (ref?.id ? ref.id : "");

const initialFormState = {
  id: "",
  number: "", 
  amount: 0,
  amount_due: 0,
  companyId: "",
  customerId: "",
  projectId: "",
  timelineId: "",
};

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const { alert } = useDialog();
  const router = useRouter();
  const { company } = useParams();
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 1. Fetch Invoices
    const q = query(collection(db, "invoices"), orderBy("time_created", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    // 2. Fetch Customers for the name lookup
    const fetchCustomers = async () => {
      const custSnap = await getDocs(collection(db, "customers"));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchCustomers();

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper to find the customer name
  const getCustomerName = (ref: any) => {
    const id = getRefId(ref);
    if (!id) return "N/A";
    const customer = customers.find(c => c.id === id);
    if (!customer) return "Unknown Customer";
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || id;
  };

  // --- Auto-Increment Invoice Number ---
  const openAddModal = async () => {
    setIsSubmitting(true);
    
    try {
      const invSnap = await getDocs(collection(db, "invoices"));
      let nextNumber = 1;

      if (!invSnap.empty) {
        // Extract numbers and handle both pure numbers and "INV0001" formats
        const existingNumbers = invSnap.docs.map(d => {
          const val = d.data().number;
          if (typeof val === 'string') {
            const parsed = parseInt(val.replace(/\D/g, ''), 10);
            return isNaN(parsed) ? 0 : parsed;
          }
          if (typeof val === 'number') return val;
          return 0;
        });

        const maxNumber = Math.max(...existingNumbers, 0);
        if (maxNumber > 0) {
          nextNumber = maxNumber + 1;
        }
      }

      // Format it beautifully like INV0001, INV0002, etc.
      const paddedNumber = nextNumber.toString().padStart(4, '0');
      
      setFormData({
        ...initialFormState,
        number: `INV${paddedNumber}`
      });
      setIsFormModalOpen(true);
    } catch (error) {
      console.error("Error generating invoice number:", error);
      alert("Could not generate a new invoice number.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (invoice: any) => {
    setFormData({
      id: invoice.id,
      number: invoice.number || "",
      amount: invoice.amount || 0,
      amount_due: invoice.amount_due || 0,
      companyId: getRefId(invoice.company),
      customerId: getRefId(invoice.customer),
      projectId: getRefId(invoice.project),
      timelineId: getRefId(invoice.timeline),
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date();
      
      const invoiceData: any = {
        number: formData.number, 
        amount: Number(formData.amount),
        amount_due: Number(formData.amount_due),
        company: formData.companyId ? doc(db, 'companies', formData.companyId) : null,
        customer: formData.customerId ? doc(db, 'customers', formData.customerId) : null,
        project: formData.projectId ? doc(db, 'projects', formData.projectId) : null,
        timeline: formData.timelineId ? doc(db, 'timelines', formData.timelineId) : null,
        time_updated: now
      };

      if (formData.id) {
        const docRef = doc(db, "invoices", formData.id);
        await updateDoc(docRef, invoiceData);
      } else {
        invoiceData.time_created = now;
        invoiceData.line_items = []; 
        invoiceData.status = "open";
        await addDoc(collection(db, "invoices"), invoiceData);
      }
      
      setIsFormModalOpen(false);
      setFormData(initialFormState);
    } catch (error) {
      console.error("Error saving document: ", error);
      await alert("Failed to save invoice. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((inv: any) => {
    if (!searchQuery) return true;

    const searchableMatch = `${inv.number || ''} ${inv.id || ''} ${getRefId(inv.customer) || ''}`.toLowerCase();
    return searchableMatch.includes(searchQuery);
  });

  const columns = [
    {
      header: "Invoice #",
      key: "number",
      render: (item: any) => (
        <div className="py-2">
          <p className="font-semibold text-slate-900">{item.number || item.id}</p>
        </div>
      )
    },
    {
      header: "Customer",
      key: "customerRef",
      className: "py-2 text-sm",
      render: (item: any) => getCustomerName(item.customer)
    },
    {
      header: "Amount",
      key: "amount",
      className: "py-2 text-sm",
      render: (item: any) => `$${item.amount?.toFixed(2)}`
    },
    {
      header: "Status",
      key: "status",
      className: "py-2",
      render: (item: any) => <PaymentBadge amountDue={item.amount_due || 0} />
    },
    {
      header: "Actions",
      key: "actions",
      className: "py-2 text-right",
      render: (item: any) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          >
            <Edit size={16} className="mr-1" />
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${company}/invoice/${item.id}`);
            }}
          >
            <ExternalLink size={16} className="mr-1" />
            Details
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading Invoices...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10 min-h-screen">
      <div className="flex-1 p-6 overflow-y-auto w-full">
        <div className="max-w-[98%] mx-auto space-y-4">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Manage billing, payments, and client accounts.
            </p>
            {/* Styled as a black button */}
            <Button 
              onClick={openAddModal}
              disabled={isSubmitting}
              className="cursor-pointer shrink-0 ml-4 bg-black hover:bg-slate-800 text-white"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              <span>Create Invoice</span>
            </Button>
          </div>

          <DataTable 
            columns={columns}
            data={filteredInvoices} 
            onRowClick={(item: any) => router.push(`/${company}/invoice/${item.id}`)}
            emptyMessage={searchQuery ? `No invoices found matching "${searchQuery}".` : "No invoices found."}
          />

      {/* Add / Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-semibold text-lg text-slate-800">
                {formData.id ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Invoice Number</label>
                  <input 
                    type="text" 
                    readOnly
                    name="number" 
                    value={formData.number} 
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-medium text-sm cursor-not-allowed" 
                  />
                </div>

                {/* Financials */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Total Amount ($)</label>
                  <input required type="number" step="0.01" min="0" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount Due ($)</label>
                  <input required type="number" step="0.01" min="0" name="amount_due" value={formData.amount_due} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
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
                <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                  Cancel
                </Button>
                {/* Styled as a black button */}
                <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-slate-800 text-white min-w-[140px] cursor-pointer">
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                  {formData.id ? 'Save Changes' : 'Create Invoice'}
                </Button>
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