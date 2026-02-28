'use client';

import { use, useEffect, useState } from "react";
import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where, updateDoc, addDoc, serverTimestamp, getCountFromServer, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CircleDashed, Pen, Plus, Check, X, MoreHorizontal, Copy, Trash, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CustomerDetailsBox } from "@/components/customer/CustomerDetailsBox";
import { ProjectManager } from "@/components/ticket/ProjectManager";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { useBreadcrumbs } from "@/lib/breadcrumb-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TicketPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { setCustomTitle } = useBreadcrumbs();

  const [ticketData, setTicketData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Editing Original Request
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editedRequest, setEditedRequest] = useState("");

  // States for Popup Change Customer
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [availableBaseCustomers, setAvailableBaseCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  // States for New Customer
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });

  // Listen to Ticket
  useEffect(() => {
    const ticketRef = doc(db, "tickets", id);
    const unsubscribe = onSnapshot(ticketRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setTicketData(data);
        if (data.number) {
          setCustomTitle(String(data.number));
        } else {
          setCustomTitle(id);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, setCustomTitle]);

  // Listen to Customer
  useEffect(() => {
    if (!ticketData?.customer) {
      setCustomerData(null);
      return;
    }
    const customerRef = typeof ticketData.customer === 'string' 
      ? doc(db, ticketData.customer)
      : ticketData.customer;

    const unsubscribe = onSnapshot(customerRef, (snap: any) => {
      if (snap.exists()) {
        setCustomerData({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, [ticketData?.customer]);

  // Listen to Associated Projects
  useEffect(() => {
    const ticketRef = doc(db, "tickets", id);
    const qProjects = query(collection(db, "projects"), where("ticket", "==", ticketRef));
    const unsubscribe = onSnapshot(qProjects, (snap: any) => {
      setProjects(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [id]);

  // Fetch Customers for Dialog
  useEffect(() => {
    if (isCustomerDialogOpen) {
      const q = query(
        collection(db, "customers")
      );
      const unsubscribe = onSnapshot(q, (snap: any) => {
        setAvailableBaseCustomers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [isCustomerDialogOpen]);

  if (loading) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Loading ticket details...</div>;
  if (!ticketData) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Ticket not found or deleted.</div>;

  const ticketRef = doc(db, "tickets", id);

  const logEvent = async (note: string, type: string = "system_event") => {
    if (!ticketData?.timeline) return;
    const timelineRef = typeof ticketData.timeline === 'string' ? doc(db, ticketData.timeline) : ticketData.timeline;
    
    const entryData: any = {
      company: doc(db, "companies", company),
      generated_by: ticketRef,
      note,
      type,
      timeline: timelineRef,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    };
    if (user) {
      entryData.user = doc(db, "users", user.uid);
    }
    await addDoc(collection(db, "timeline_entries"), entryData);
  };

  // Status Handlers
  const hasConfirmedProject = projects.some(p => p.status === 'open' || p.status === 'completed');
  const baseStatus = ticketData.status?.toLowerCase() || 'open';
  const displayStatus = hasConfirmedProject ? 'Won' : (baseStatus.charAt(0).toUpperCase() + baseStatus.slice(1));

  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === baseStatus) return;
    await updateDoc(ticketRef, { status: newStatus });
    await logEvent(`User changed ticket status (${baseStatus.charAt(0).toUpperCase() + baseStatus.slice(1)} -> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)})`, "status_update");
  };

  // Request Handlers
  const currentRequestText = ticketData.request || ticketData.description || ticketData.note || "";
  const handleEditRequestStart = () => {
    setEditedRequest(currentRequestText);
    setIsEditingRequest(true);
  };
  
  const handleSaveRequest = async () => {
    if (editedRequest === currentRequestText) {
      setIsEditingRequest(false);
      return;
    }
    await updateDoc(ticketRef, { request: editedRequest });
    await logEvent(`User updated the request details`, "request_update");
    setIsEditingRequest(false);
  };

  // Customer Handlers
  const handleSelectNewCustomer = async (customerId: string, customerName?: string) => {
    await updateDoc(ticketRef, { customer: doc(db, "customers", customerId) });
    await logEvent(`User changed linked customer to ${customerName || 'a new customer'}`, "customer_update");
    setIsCustomerDialogOpen(false);
    setCustomerSearch("");
  };

  const filteredCustomers = availableBaseCustomers.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''} ${c.name || ''} ${c.email || ''}`.toLowerCase();
    return name.includes(customerSearch.toLowerCase());
  });

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        const c = filteredCustomers[0];
        await handleSelectNewCustomer(c.id, `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name);
      }
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerForm.first_name.trim()) return;

    const newCustomerRef = await addDoc(collection(db, "customers"), {
      company: doc(db, "companies", company),
      first_name: newCustomerForm.first_name,
      last_name: newCustomerForm.last_name,
      email: newCustomerForm.email,
      phone: newCustomerForm.phone,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    await handleSelectNewCustomer(newCustomerRef.id, `${newCustomerForm.first_name} ${newCustomerForm.last_name}`);
    setIsNewCustomerDialogOpen(false);
    setNewCustomerForm({ first_name: "", last_name: "", email: "", phone: "" });
  };

  const handleDuplicateTicket = async () => {
    const qTicketsCount = query(collection(db, "tickets"), where("company", "==", doc(db, "companies", company)));
    const snapshot = await getCountFromServer(qTicketsCount);
    const count = snapshot.data().count;
    const newTicketNumber = count + 1;

    const newTimelineRef = await addDoc(collection(db, "timelines"), {
      company: doc(db, "companies", company),
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    const newTicketRef = await addDoc(collection(db, "tickets"), {
      ...ticketData,
      number: newTicketNumber,
      timeline: newTimelineRef,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    const entryData: any = {
      company: doc(db, "companies", company),
      generated_by: newTicketRef,
      note: `Ticket was duplicated from ticket #${ticketData.number || id}.`,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
      timeline: newTimelineRef,
      type: "ticket_creation",
    };
    if (user) {
      entryData.user = doc(db, "users", user.uid);
    }
    await addDoc(collection(db, "timeline_entries"), entryData);

    router.push(`/${company}/ticket/${newTicketRef.id}`);
  };

  const handleDeleteTicket = async () => {
    if (confirm("Are you sure you want to delete this ticket? This action cannot be undone.")) {
      await deleteDoc(ticketRef);
      router.push(`/${company}/tickets`);
    }
  };

  const timelineId = ticketData?.timeline?.id || ticketData?.timeline;

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {ticketData.number ? ticketData.number : id}
              </h1>
              <p className="text-muted-foreground mt-1 mb-3">Lead & Request details</p>
              <AssigneeSelector 
                company={company} 
                docRef={ticketRef} 
                currentAssignees={ticketData.assigned_users || []} 
                logEvent={logEvent} 
              />
            </div>
            
            {hasConfirmedProject ? (
              <Badge variant="default" className="text-sm px-3 py-1 rounded-full cursor-pointer">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Won
              </Badge>
            ) : (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-sm px-3 py-1 h-auto rounded-full cursor-pointer" size="sm">
                      {baseStatus === 'open' && <CircleDashed className="w-4 h-4 mr-2 text-blue-500" />}
                      {baseStatus === 'cancelled' && <X className="w-4 h-4 mr-2 text-red-500" />}
                      {baseStatus === 'complete' && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
                      <span className="capitalize">{baseStatus}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('open')}>
                      <CircleDashed className="w-4 h-4 mr-2 text-blue-500" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('complete')}>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('cancelled')}>
                      <X className="w-4 h-4 mr-2 text-red-500" /> Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={handleDuplicateTicket}>
                      <Copy className="w-4 h-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 cursor-pointer" onClick={handleDeleteTicket}>
                      <Trash className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomerDetailsBox
              customerData={customerData}
              isCustomerDialogOpen={isCustomerDialogOpen}
              setIsCustomerDialogOpen={setIsCustomerDialogOpen}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              handleSearchKeyDown={handleSearchKeyDown}
              filteredCustomers={filteredCustomers}
              handleSelectNewCustomer={handleSelectNewCustomer}
              isNewCustomerDialogOpen={isNewCustomerDialogOpen}
              setIsNewCustomerDialogOpen={setIsNewCustomerDialogOpen}
              newCustomerForm={newCustomerForm}
              setNewCustomerForm={setNewCustomerForm}
              handleCreateNewCustomer={handleCreateNewCustomer}
            />

            {/* Request Info Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Request Information
                </CardTitle>
                {!isEditingRequest && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleEditRequestStart}>
                    <Pen className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="mt-2">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Original Request</div>
                    {isEditingRequest ? (
                      <div className="space-y-2">
                        <Textarea 
                          value={editedRequest}
                          onChange={(e) => setEditedRequest(e.target.value)}
                          className="min-h-[100px] text-sm"
                          placeholder="Enter request details..."
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingRequest(false)} className="cursor-pointer">Cancel</Button>
                          <Button size="sm" onClick={handleSaveRequest} className="cursor-pointer">Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap border min-h-[60px]">
                        {currentRequestText || <span className="text-muted-foreground italic">No request details provided.</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="text-sm font-medium">
                      {ticketData.time_created ? new Date(ticketData.time_created.toDate?.() || ticketData.time_created).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Associated Projects Card */}
        <div className="space-y-4">
          <ProjectManager companyId={company} ticketId={id} ticketData={ticketData} logEvent={logEvent} />
        </div>
        </div>
      </div>

      <aside className="w-[550px] flex-shrink-0 bg-background h-full border-l overflow-hidden">
        {timelineId ? (
          <Timeline 
            companyId={company} 
            timelineId={typeof timelineId === 'object' ? timelineId.id : timelineId} 
            generatedById={id} 
            generatedByType="tickets" 
          />
        ) : (
          <div className="p-4 text-sm text-muted-foreground h-full flex items-center justify-center">
            No timeline attached to this ticket.
          </div>
        )}
      </aside>
    </div>
  );
}
