"use client";

import { use, useEffect, useState } from "react";
import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, updateDoc, addDoc, serverTimestamp, getCountFromServer, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CircleDashed, X, MoreHorizontal, Copy, Trash, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { CustomerDetailsBox } from "@/components/customer/CustomerDetailsBox";
import { LineItemsManager } from "@/components/project/LineItemsManager";
import { InvoiceManager } from "@/components/project/InvoiceManager";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [projectData, setProjectData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States for Popup Change Customer
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [availableBaseCustomers, setAvailableBaseCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  // States for New Customer
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });

  // Listen to Project
  useEffect(() => {
    const projectRef = doc(db, "projects", id);
    const unsubscribe = onSnapshot(projectRef, (snap: any) => {
      if (snap.exists()) {
        setProjectData(snap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Listen to Customer
  useEffect(() => {
    if (!projectData?.customer) {
      setCustomerData(null);
      return;
    }
    const customerRef = typeof projectData.customer === 'string' 
      ? doc(db, projectData.customer)
      : projectData.customer;

    const unsubscribe = onSnapshot(customerRef, (snap: any) => {
      if (snap.exists()) {
        setCustomerData({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, [projectData?.customer]);

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

  if (loading) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Loading project details...</div>;
  if (!projectData) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Project not found or deleted.</div>;

  const projectRef = doc(db, "projects", id);

  const logEvent = async (note: string, type: string = "system_event") => {
    if (!projectData?.timeline) return;
    const timelineRef = typeof projectData.timeline === 'string' ? doc(db, projectData.timeline) : projectData.timeline;
    
    const entryData: any = {
      company: doc(db, "companies", company),
      generated_by: projectRef,
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
  const baseStatus = projectData.status?.toLowerCase() || 'draft';
  
  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === baseStatus) return;
    await updateDoc(projectRef, { status: newStatus });
    await logEvent(`User changed project status (${baseStatus.charAt(0).toUpperCase() + baseStatus.slice(1)} -> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)})`, "status_update");
  };

  // Customer Handlers
  const handleSelectNewCustomer = async (customerId: string, customerName?: string) => {
    await updateDoc(projectRef, { customer: doc(db, "customers", customerId) });
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

  const handleDuplicateProject = async () => {
    const qProjectsCount = query(collection(db, "projects"));
    const snapshot = await getCountFromServer(qProjectsCount);
    const count = snapshot.data().count;
    const newProjectNumber = 1000 + count + 1;

    const newTimelineRef = await addDoc(collection(db, "timelines"), {
      company: doc(db, "companies", company),
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    const newProjectRef = await addDoc(collection(db, "projects"), {
      ...projectData,
      number: newProjectNumber,
      timeline: newTimelineRef,
      status: "draft",
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    const entryData: any = {
      company: doc(db, "companies", company),
      generated_by: newProjectRef,
      note: `Project was duplicated from ${projectData.number || id}.`,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
      timeline: newTimelineRef,
      type: "project_creation",
    };
    if (user) {
      entryData.user = doc(db, "users", user.uid);
    }
    await addDoc(collection(db, "timeline_entries"), entryData);

    router.push(`/${company}/project/${newProjectRef.id}`);
  };

  const handleDeleteProject = async () => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      await deleteDoc(projectRef);
      router.push(`/${company}/projects`);
    }
  };

  const timelineId = projectData?.timeline?.id || projectData?.timeline;

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Project {projectData.number ? `PROJ${projectData.number}` : projectData.id}
              </h1>
              <p className="text-muted-foreground mt-1 mb-3">Project & Quote details</p>
              <AssigneeSelector 
                company={company} 
                docRef={projectRef} 
                currentAssignees={projectData.assigned_users || []} 
                logEvent={logEvent} 
              />
            </div>
            
            <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-sm px-3 py-1 h-auto rounded-full cursor-pointer" size="sm">
                      {baseStatus === 'draft' && <CircleDashed className="w-4 h-4 mr-2 text-slate-500" />}
                      {baseStatus === 'open' && <CircleDashed className="w-4 h-4 mr-2 text-blue-500" />}
                      {baseStatus === 'completed' && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
                      {baseStatus === 'cancelled' && <X className="w-4 h-4 mr-2 text-red-500" />}
                      <span className="capitalize">{baseStatus}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('draft')}>
                      <CircleDashed className="w-4 h-4 mr-2 text-slate-500" /> Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('open')}>
                      <CircleDashed className="w-4 h-4 mr-2 text-blue-500" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('completed')}>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleUpdateStatus('cancelled')}>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-red-500" /> Cancelled
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
                    <DropdownMenuItem className="cursor-pointer" onClick={handleDuplicateProject}>
                      <Copy className="w-4 h-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 cursor-pointer" onClick={handleDeleteProject}>
                      <Trash className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

            {/* Basic Info Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-2">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                    <Badge variant={['open', 'completed'].includes(baseStatus) ? "default" : "secondary"} className="capitalize">
                      {baseStatus}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Original Ticket</div>
                    <div className="text-sm font-medium">
                       {projectData.ticket ? (
                          <div 
                             className="text-blue-600 hover:underline cursor-pointer" 
                             onClick={() => router.push(`/${company}/ticket/${typeof projectData.ticket === 'string' ? projectData.ticket : projectData.ticket.id}`)}
                          >
                             View Linked Ticket
                          </div>
                       ) : 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="text-sm font-medium">
                      {projectData.time_created ? new Date(projectData.time_created.toDate?.() || projectData.time_created).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Manager */}
          <InvoiceManager companyId={company} projectId={id} projectData={projectData} logEvent={logEvent} />

          {/* Line Items Manager */}
          <LineItemsManager companyId={company} projectId={id} projectData={projectData} logEvent={logEvent} />

        </div>
      </div>

      <aside className="w-[550px] flex-shrink-0 bg-background h-full border-l overflow-hidden">
        {timelineId ? (
          <Timeline 
            companyId={company} 
            timelineId={typeof timelineId === 'object' ? timelineId.id : timelineId} 
            generatedById={id} 
            generatedByType="projects" 
          />
        ) : (
          <div className="p-4 text-sm text-muted-foreground h-full flex items-center justify-center">
            No timeline attached to this project.
          </div>
        )}
      </aside>
    </div>
  );
}