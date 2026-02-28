"use client";

import { use, useEffect, useState } from "react";
import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, updateDoc, addDoc, serverTimestamp, getCountFromServer, deleteDoc, getDocs, where, getDoc, runTransaction } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CircleDashed, X, MoreHorizontal, Copy, Trash, FileText, Link as LinkIcon, ExternalLink, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { CustomerDetailsBox } from "@/components/customer/CustomerDetailsBox";
import { LineItemsManager } from "@/components/project/LineItemsManager";
import { InvoiceManager } from "@/components/project/InvoiceManager";
import { ManufacturingManager } from "@/components/project/ManufacturingManager";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { useBreadcrumbs } from "@/lib/breadcrumb-context";
import { useDialog } from "@/lib/dialog-context";
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
  const { setCustomTitle } = useBreadcrumbs();
  const { alert, confirm } = useDialog();

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

  const [copiedLink, setCopiedLink] = useState(false);

  // Listen to Project
  useEffect(() => {
    const projectRef = doc(db, "projects", id);
    const unsubscribe = onSnapshot(projectRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setProjectData(data);
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

  const logEvent = async (note: string, type: string = "system_event", is_public: boolean = false) => {
    if (!projectData?.timeline) return;
    const timelineRef = typeof projectData.timeline === 'string' ? doc(db, projectData.timeline) : projectData.timeline;
    
    const entryData: any = {
      company: doc(db, "companies", company),
      generated_by: projectRef,
      note,
      type,
      is_public,
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
    await logEvent(`Changed project status (${baseStatus.charAt(0).toUpperCase() + baseStatus.slice(1)} -> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)})`, "status_update", true);
  };

  const handleApprove = async () => {
    try {
      await updateDoc(doc(db, "projects", id), { approved: true, rejected: false, status: "open" });
      
      const itemsQuery = query(collection(db, "product_instances"), where("project", "==", doc(db, "projects", id)));
      const itemsSnap = await getDocs(itemsQuery);
      
      for (const itemDoc of itemsSnap.docs) {
          const itemData = itemDoc.data();
          if (itemData.product) {
              const productId = typeof itemData.product === 'string' ? itemData.product : itemData.product.id;
              const productRef = doc(db, "products", productId);
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                  const prodData = productSnap.data() as Product;
                  if (prodData.is_manufactured) {
                      let stepsToUse = prodData.manufacturing_steps || [];
                      
                      await runTransaction(db, async (transaction) => {
                          const counterRef = doc(db, "counters", "manufacturing_orders");
                          const counterSnap = await transaction.get(counterRef);

                          let newNumber = 1001;
                          if (counterSnap.exists()) {
                              const data = counterSnap.data();
                              newNumber = (data.last_number || 1000) + 1;
                          }

                          transaction.set(counterRef, { last_number: newNumber }, { merge: true });

                          const newOrderRef = doc(collection(db, "manufacturing_orders"));
                          
                          const formattedSteps = stepsToUse.map((s: any, idx: number) => ({
                              id: `step-${Date.now()}-${idx}`,
                              description: s.description || s,
                              is_completed: false,
                              notes: ""
                          }));

                          transaction.set(newOrderRef, {
                              number: newNumber,
                              company: doc(db, "companies", company),
                              project: doc(db, "projects", id),
                              product_ref: productRef,
                              product_name: prodData.name || `MO-${newNumber}`,
                              status: "not_started",
                              start_date: serverTimestamp(),
                              steps: formattedSteps,
                              bom: prodData.bom || [],
                              product_instance_id: itemDoc.id,
                              qty: itemData.qty || 1,
                              time_created: serverTimestamp(),
                              time_updated: serverTimestamp()
                          });

                          return newOrderRef.id;
                      });
                  }
              }
          }
      }

      if (projectData.ticket) {
        const ticketRef = typeof projectData.ticket === 'string' 
          ? doc(db, projectData.ticket) 
          : doc(db, "tickets", projectData.ticket.id);
        await updateDoc(ticketRef, { status: "complete" });
      }

      await logEvent("Manually marked proposal as Approved.", "approval", true);
    } catch (err) {
       console.error("Error approving project or generating orders:", err);
       await alert("Error approving project or generating orders. Please check console.");
    }
  };

  const handlePending = async () => {
    await updateDoc(doc(db, "projects", id), { approved: false, rejected: false });
    await logEvent("Reset proposal to Pending status.", "status_update", true);
  };

  const handleReject = async () => {
    await updateDoc(doc(db, "projects", id), { approved: false, rejected: true });
    await logEvent("Manually marked proposal as Rejected.", "rejection", true);
  };

  const handleCopyLink = async () => {
    let token = projectData.token;
    if (!token) {
      token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await updateDoc(projectRef, { token });
    }
    const link = `${window.location.origin}/order/${id}?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenPortal = async () => {
    let token = projectData.token;
    if (!token) {
      token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await updateDoc(projectRef, { token });
    }
    const link = `${window.location.origin}/order/${id}?token=${token}`;
    window.open(link, '_blank');
  };

  // Customer Handlers
  const handleSelectNewCustomer = async (customerId: string, customerName?: string) => {
    await updateDoc(projectRef, { customer: doc(db, "customers", customerId) });
    await logEvent(`Changed linked customer to ${customerName || 'a new customer'}`, "customer_update");
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
    if (await confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
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
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                {projectData.number ? projectData.number : projectData.id}
              </h1>
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Project Information
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-auto py-1 px-2 text-xs rounded-md cursor-pointer border shadow-sm">
                      {projectData.approved ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="font-semibold">Approved</span>
                        </div>
                      ) : projectData.rejected ? (
                        <div className="flex items-center gap-1 text-red-700">
                          <X className="w-3 h-3" />
                          <span className="font-semibold">Rejected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-700">
                          <CircleDashed className="w-3 h-3" />
                          <span className="font-semibold">Pending</span>
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={handleApprove}>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={handlePending}>
                      <CircleDashed className="w-4 h-4 mr-2 text-yellow-500" /> Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={handleReject}>
                      <X className="w-4 h-4 mr-2 text-red-500" /> Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="mt-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 w-full">
                    <Button variant="outline" className="flex-1 cursor-pointer" onClick={handleOpenPortal}>
                      <ExternalLink className="w-4 h-4 mr-2" /> View Portal
                    </Button>
                    <Button variant="outline" className="flex-1 cursor-pointer" onClick={handleCopyLink}>
                      {copiedLink ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />} 
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </Button>
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

          {/* Manufacturing Manager */}
          <ManufacturingManager companyId={company} projectId={id} />

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