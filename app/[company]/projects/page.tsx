"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, addDoc, doc, getDocs } from 'firebase/firestore';
import { Loader2, Plus, X } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Project, Customer, Ticket } from "@/types";
import { useDialog } from "@/lib/dialog-context";
import { formatEntityNumber } from "@/lib/utils";

// Import your custom searchable dropdown components
import { CustomerSelectionForm } from "@/components/customer/CustomerSelectionForm";
import { TicketSelectionForm } from "@/components/ticket/TicketSelectionForm"; // Adjust path if you saved it elsewhere!

export default function ProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  const { alert } = useDialog();
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Modal & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data for Dropdowns/Lookups
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Form Fields
  const [projectNumber, setProjectNumber] = useState<number | "">("");
  
  // Financial Fields
  const [amount, setAmount] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [depositRequired, setDepositRequired] = useState<string>("");

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Ticket Selection State
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedTicketNumber, setSelectedTicketNumber] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  useEffect(() => {
    // 1. Fetch Projects
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

    // 2. Fetch Customers and Tickets for the form
    const fetchData = async () => {
      const custSnap = await getDocs(collection(db, "customers"));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[]);
      
      const ticketSnap = await getDocs(collection(db, "tickets"));
      setTickets(ticketSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Ticket[]);
    };
    fetchData();

    return () => unsubscribe();
  }, [company]);

  // --- Open Modal & Auto-Increment Project Number ---
  const handleOpenModal = async () => {
    setIsSubmitting(true);
    
    try {
      const projSnap = await getDocs(collection(db, "projects"));
      let nextNumber = 1001; 

      if (!projSnap.empty) {
        const existingNumbers = projSnap.docs.map(d => {
          const val = d.data().number;
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const parsed = parseInt(val.replace(/\D/g, ''), 10);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        });

        const maxNumber = Math.max(...existingNumbers, 0);
        if (maxNumber >= 1000) {
          nextNumber = maxNumber + 1;
        }
      }

      setProjectNumber(nextNumber);
      
      // Clear out the form fields
      setSelectedTicketId("");
      setSelectedTicketNumber("");
      setTicketSearch("");
      setSelectedCustomerId("");
      setSelectedCustomerName("");
      setCustomerSearch("");
      setAmount("");
      setCost("");
      setDepositRequired("");
      
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error generating project number:", error);
      alert("Could not generate a new project number.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to generate a random alphanumeric token
  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // --- Handle Project Submission ---
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      await alert("Please select a customer");
      return;
    }
    
    setIsSubmitting(true);

    const parsedAmount = parseFloat(amount) || 0;
    const parsedCost = parseFloat(cost) || 0;
    const parsedDeposit = parseFloat(depositRequired) || 0;

    try {
      const newTimelineRef = await addDoc(collection(db, "timelines"), {
        company: doc(db, "companies", company),
        time_created: new Date(),
        time_updated: new Date(),
      });

      // Matches your firebase screenshot structure exactly
      const newProjectRef = await addDoc(collection(db, "projects"), {
        amount: parsedAmount,
        amount_due: parsedAmount,
        approved: false,
        assigned_users: [],
        company: doc(db, "companies", company),
        cost: parsedCost,
        customer: doc(db, "customers", selectedCustomerId),
        deposit_required: parsedDeposit,
        invoices: [],
        line_items: [],
        number: Number(projectNumber),
        rejected: false,
        status: "open",
        timeline: newTimelineRef,
        ticket: selectedTicketId ? doc(db, "tickets", selectedTicketId) : null,
        time_created: new Date(),
        time_updated: new Date(),
        token: generateToken(),
      });

      await addDoc(collection(db, "timeline_entries"), {
        company: doc(db, "companies", company),
        generated_by: newProjectRef,
        note: `Project created.`,
        type: "project_creation",
        timeline: newTimelineRef,
        time_created: new Date(),
        time_updated: new Date(),
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding project:", error);
      await alert("Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Filters ---
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const searchString = `${item.number || ''} ${item.status || ''}`.toLowerCase();
    return searchString.includes(searchQuery);
  });

  const filteredModalCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const searchStr = `${c.first_name || ''} ${c.last_name || ''} ${c.email || ''} ${c.company_name || ''}`.toLowerCase();
    return searchStr.includes(customerSearch.toLowerCase());
  });

  const filteredModalTickets = tickets.filter(t => {
    if (!ticketSearch) return true;
    const searchStr = `${t.number || ''} ${t.request || ''}`.toLowerCase();
    return searchStr.includes(ticketSearch.toLowerCase());
  });

  const columns = [
    {
      header: "Project #",
      key: "number",
      render: (item: any) => (
        <span className="font-semibold text-slate-900">
          {item.number ? formatEntityNumber(item.number, 'PROJ') : '---'}
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
            {/* BLACK BUTTON HERE */}
            <Button 
              onClick={handleOpenModal} 
              disabled={isSubmitting}
              className="cursor-pointer shrink-0 ml-4 bg-black hover:bg-slate-800 text-white"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Project
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

      {/* --- Create Project Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-lg text-slate-800">Create New Project</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddProject} className="p-6 overflow-y-auto space-y-6">
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Project Number</label>
                  <input 
                    type="text" 
                    readOnly
                    value={formatEntityNumber(projectNumber, 'PROJ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-medium text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Customer</label>
                  {selectedCustomerId ? (
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <span className="font-medium text-sm text-slate-900">{selectedCustomerName}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-700 h-8 cursor-pointer"
                        onClick={() => {
                          setSelectedCustomerId("");
                          setSelectedCustomerName("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <CustomerSelectionForm
                      searchQuery={customerSearch}
                      onSearchChange={setCustomerSearch}
                      filteredCustomers={filteredModalCustomers}
                      onSelectCustomer={(id, name) => {
                        setSelectedCustomerId(id);
                        setSelectedCustomerName(name || "Unknown Customer");
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Linked Ticket (Optional)</label>
                  
                  {/* Searchable Ticket Component */}
                  {selectedTicketId ? (
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <span className="font-medium text-sm text-blue-600">{selectedTicketNumber}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-500 hover:text-slate-700 h-8 cursor-pointer"
                        onClick={() => {
                          setSelectedTicketId("");
                          setSelectedTicketNumber("");
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <TicketSelectionForm
                      searchQuery={ticketSearch}
                      onSearchChange={setTicketSearch}
                      filteredTickets={filteredModalTickets}
                      onSelectTicket={(id, number) => {
                        setSelectedTicketId(id);
                        setSelectedTicketNumber(number || "Unknown Ticket");
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Financials Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Financials</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Amount ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cost ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-2 w-1/2 pr-2">
                  <label className="text-sm font-medium text-slate-700">Deposit Required ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={depositRequired}
                    onChange={(e) => setDepositRequired(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6 shrink-0 pb-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                {/* BLACK BUTTON HERE */}
                <Button type="submit" disabled={isSubmitting || !selectedCustomerId} className="bg-black hover:bg-slate-800 text-white min-w-[120px] cursor-pointer">
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