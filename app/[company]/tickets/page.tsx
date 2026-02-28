"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
// Added addDoc and doc for creating references
import { collection, onSnapshot, query, addDoc, doc, getDocs } from 'firebase/firestore';
import { Loader2, Plus, X } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Ticket, Customer } from "@/types";

export default function TicketsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Modal & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Form Fields
  const [ticketNumber, setTicketNumber] = useState("");
  const [request, setRequest] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  useEffect(() => {
    // 1. Fetch Tickets
    const q = query(collection(db, "tickets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as Ticket[];
      setData(result);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    // 2. Fetch Customers for the dropdown
    const fetchCustomers = async () => {
      const custSnap = await getDocs(collection(db, "customers"));
      const custList = custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      setCustomers(custList);
    };
    fetchCustomers();

    return () => unsubscribe();
  }, [company]);

  // --- Handle Ticket Submission ---
  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return alert("Please select a customer");
    
    setIsSubmitting(true);

    try {
      // Matches your firebase screenshot structure exactly
      await addDoc(collection(db, "tickets"), {
        number: ticketNumber,
        request: request,
        status: "open",
        customer: doc(db, "customers", selectedCustomerId), // Reference
        company: doc(db, "companies", company), // Reference
        assigned_users: [], // Initializing as empty array per screenshot
        projects: [], // Initializing as empty array per screenshot
        time_created: new Date(),
        time_updated: new Date(),
      });

      // Reset & Close
      setTicketNumber("");
      setRequest("");
      setSelectedCustomerId("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding ticket:", error);
      alert("Failed to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const searchString = `${item.number || ''} ${item.request || ''} ${item.status || ''}`.toLowerCase();
    return searchString.includes(searchQuery);
  });

  const columns = [
    {
      header: "Ticket #",
      key: "number",
      render: (item: Ticket) => (
        <span className="cursor-pointer shrink-0 ml-4">
          {item.number || '---'}
        </span>
      )
    },
    {
      header: "Request",
      key: "request",
      className: "max-w-[300px] truncate",
      render: (item: Ticket) => item.request || "No description"
    },
    {
      header: "Status",
      key: "status",
      render: (item: Ticket) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "open"}
        </span>
      )
    },
    {
      header: "Created Date",
      key: "time_created",
      className: "text-sm text-muted-foreground",
      render: (item: Ticket) => item.time_created?.toDate 
        ? item.time_created.toDate().toLocaleDateString() 
        : "Unknown"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/10 h-screen w-full">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10 min-h-screen">
      <div className="flex-1 p-6 overflow-y-auto w-full">
        <div className="max-w-[98%] mx-auto space-y-4">
          
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Manage customer requests and tickets.
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)} 
              className="cursor-pointer shrink-0 ml-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Ticket
            </Button>
          </div>

          <DataTable 
            columns={columns}
            data={filteredData}
            onRowClick={(item: Ticket) => router.push(`/${company}/ticket/${item.id}`)}
            emptyMessage={searchQuery ? `No tickets found matching "${searchQuery}".` : "No tickets found."}
          />
        </div>
      </div>

      {/* --- Create Ticket Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">Create New Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTicket} className="p-6 space-y-4">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ticket Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. TK0512"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Customer</label>
                <select 
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                >
                  <option value="">Select a customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Request Details</label>
                <textarea 
                  required
                  placeholder="Describe the customer's request..."
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[120px]" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="cursor-pointer shrink-0 ml-4">
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}