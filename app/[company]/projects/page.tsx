"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
// 1. Added addDoc and doc for creating those database references
import { collection, onSnapshot, query, addDoc, doc, getDocs } from 'firebase/firestore';
import { Loader2, Plus, X } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Project, Customer, Ticket } from "@/types";
import { useDialog } from "@/lib/dialog-context";

export default function ProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  const { alert } = useDialog();
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NEW: Modal & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Form Fields
  const [projectNumber, setProjectNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");

  useEffect(() => {
    // Fetch Projects
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as Project[];
      setData(result);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    // Fetch Customers and Tickets for dropdowns
    const fetchData = async () => {
      const custSnap = await getDocs(collection(db, "customers"));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[]);
      
      const ticketSnap = await getDocs(collection(db, "tickets"));
      setTickets(ticketSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Ticket[]);
    };
    fetchData();

    return () => unsubscribe();
  }, [company]);

  // --- NEW: Handle Project Submission ---
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      await alert("Please select a customer");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Matches your firebase screenshot structure exactly
      await addDoc(collection(db, "projects"), {
        number: projectNumber,
        status: "completed", // Setting as completed per your screenshot example
        amount: 0,
        amount_due: 0,
        assigned_users: [], // Initializing as empty array
        customer: doc(db, "customers", selectedCustomerId), 
        ticket: selectedTicketId ? doc(db, "tickets", selectedTicketId) : null,
        company: doc(db, "companies", company),
        time_created: new Date(),
        time_updated: new Date(),
        // Timeline and invoices would typically be created in separate steps or as references
        invoices: [],
        line_items: [] 
      });

      // Reset & Close
      setProjectNumber("");
      setSelectedCustomerId("");
      setSelectedTicketId("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding project:", error);
      await alert("Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const searchString = `${item.number || ''} ${item.status || ''}`.toLowerCase();
    return searchString.includes(searchQuery);
  });

  const columns = [
    {
      header: "Project #",
      key: "number",
      render: (item: any) => (
        <span className="font-semibold text-slate-900">
          {item.number ? `${item.number}` : '---'}
        </span>
      )
    },
    {
      header: "Amount",
      key: "amount",
      className: "font-medium",
      render: (item: any) => (
        <span className="text-sm">
          ${(item.amount || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: "Amount Due",
      key: "amount_due",
      className: "font-medium",
      render: (item: any) => (
        <span className="text-sm text-red-600">
          ${(item.amount_due || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: "Status",
      key: "status",
      render: (item: any) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "draft"}
        </span>
      )
    },
    {
      header: "Created Date",
      key: "time_created",
      className: "text-sm text-muted-foreground",
      render: (item: any) => item.time_created?.toDate 
        ? item.time_created.toDate().toLocaleDateString() 
        : "Unknown"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/10 h-screen w-full">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10 min-h-screen">
      <div className="flex-1 p-6 overflow-y-auto w-full">
        <div className="max-w-[98%] mx-auto space-y-4">
          
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Manage projects and quotes.
            </p>
            {/* New "Add Project" Button */}
            <Button 
              onClick={() => setIsModalOpen(true)} 
              className="cursor-pointer shrink-0 ml-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Project
            </Button>
          </div>

          <DataTable 
            columns={columns}
            data={filteredData}
            onRowClick={(item: Project) => router.push(`/${company}/project/${item.id}`)}
            emptyMessage={searchQuery ? `No projects found matching "${searchQuery}".` : "No projects found."}
          />
        </div>
      </div>

      {/* --- Add Project Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">Create New Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Project Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. PROJ1005"
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
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
                <label className="text-sm font-medium text-slate-700">Linked Ticket (Optional)</label>
                <select 
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                >
                  <option value="">None</option>
                  {tickets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.number} - {t.request?.slice(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="cursor-pointer shrink-0 ml-4">
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}