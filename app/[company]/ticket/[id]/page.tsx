'use client';

import { use, useEffect, useState } from "react";
import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Building, FileText, CheckCircle2, CircleDashed, Pen, Plus, Check, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

  // Create Project State
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Listen to Ticket
  useEffect(() => {
    const ticketRef = doc(db, "tickets", id);
    const unsubscribe = onSnapshot(ticketRef, (snap: any) => {
      if (snap.exists()) {
        setTicketData(snap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

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
        collection(db, "customers"), 
        where("company", "==", doc(db, "companies", company))
      );
      const unsubscribe = onSnapshot(q, (snap: any) => {
        setAvailableBaseCustomers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [isCustomerDialogOpen, company]);

  if (loading) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Loading ticket details...</div>;
  if (!ticketData) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Ticket not found or deleted.</div>;

  const ticketRef = doc(db, "tickets", id);

  // Status Handlers
  const hasConfirmedProject = projects.some(p => p.status === 'confirmed');
  const baseStatus = ticketData.status?.toLowerCase() || 'open';
  const displayStatus = hasConfirmedProject ? 'Won' : (baseStatus.charAt(0).toUpperCase() + baseStatus.slice(1));

  const handleUpdateStatus = async (newStatus: string) => {
    await updateDoc(ticketRef, { status: newStatus });
  };

  // Request Handlers
  const currentRequestText = ticketData.request || ticketData.description || ticketData.note || "";
  const handleEditRequestStart = () => {
    setEditedRequest(currentRequestText);
    setIsEditingRequest(true);
  };
  
  const handleSaveRequest = async () => {
    await updateDoc(ticketRef, { request: editedRequest });
    setIsEditingRequest(false);
  };

  // Customer Handlers
  const handleSelectNewCustomer = async (customerId: string) => {
    await updateDoc(ticketRef, { customer: doc(db, "customers", customerId) });
    setIsCustomerDialogOpen(false);
    setCustomerSearch("");
  };

  const filteredCustomers = availableBaseCustomers.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''} ${c.name || ''} ${c.email || ''}`.toLowerCase();
    return name.includes(customerSearch.toLowerCase());
  });

  // Project Handlers
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    await addDoc(collection(db, "projects"), {
      company: doc(db, "companies", company),
      ticket: ticketRef,
      customer: ticketData.customer || null,
      title: newProjectName,
      status: "quote",
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
    });

    setIsProjectDialogOpen(false);
    setNewProjectName("");
  };

  const timelineId = ticketData?.timeline?.id || ticketData?.timeline;

  return (
    <div className="flex h-[calc(100vh)] w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Ticket {ticketData.number ? `#${ticketData.number}` : id}
              </h1>
              <p className="text-muted-foreground mt-1">Lead & Request details</p>
            </div>
            
            {hasConfirmedProject ? (
              <Badge variant="default" className="text-sm px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Won
              </Badge>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-sm px-3 py-1 h-auto rounded-full" size="sm">
                    {baseStatus === 'open' && <CircleDashed className="w-4 h-4 mr-2 text-blue-500" />}
                    {baseStatus === 'cancelled' && <X className="w-4 h-4 mr-2 text-red-500" />}
                    {baseStatus === 'complete' && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
                    <span className="capitalize">{baseStatus}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUpdateStatus('open')}>
                    <CircleDashed className="w-4 h-4 mr-2 text-blue-500" /> Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateStatus('complete')}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateStatus('cancelled')}>
                    <X className="w-4 h-4 mr-2 text-red-500" /> Cancelled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> Customer Details
                </CardTitle>
                <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pen className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Customer</DialogTitle>
                      <DialogDescription>Search and select a different customer for this lead.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input 
                        placeholder="Search customers by name or email..." 
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                      <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
                        {filteredCustomers.length === 0 ? (
                          <div className="text-center text-sm text-muted-foreground py-4">No customers found.</div>
                        ) : (
                          filteredCustomers.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 hover:bg-muted rounded-md border bg-card">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{(c.first_name || c.last_name) ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : (c.name || 'Unknown User')}</p>
                                {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                              </div>
                              <Button size="sm" variant="secondary" onClick={() => handleSelectNewCustomer(c.id)}>Select</Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4 mt-2">
                {customerData ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Name</div>
                      <div className="font-medium">
                        {(customerData.first_name || customerData.last_name) 
                          ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim()
                          : (customerData.name || 'Unknown')}
                      </div>
                    </div>
                    {customerData.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{customerData.email}</span>
                      </div>
                    )}
                    {customerData.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{customerData.phone}</span>
                      </div>
                    )}
                    {customerData.company_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{customerData.company_name}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No customer linked to this ticket.</p>
                )}
              </CardContent>
            </Card>

            {/* Request Info Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Request Information
                </CardTitle>
                {!isEditingRequest && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditRequestStart}>
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
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingRequest(false)}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveRequest}>Save</Button>
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Associated Projects & Quotes</h2>
                <p className="text-sm text-muted-foreground">Projects created from this lead.</p>
              </div>
              <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" /> New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Start a new project or quote based on this lead.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectTitle">Project Title</Label>
                      <Input 
                        id="projectTitle"
                        placeholder="e.g. Broken Screen Repair" 
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsProjectDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {projects.length > 0 ? (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Link href={`/${company}/project/${project.id}`} key={project.id}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-primary">
                              {project.number ? `Project #${project.number}` : project.title || 'Untitled Project'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Created on {project.time_created ? new Date(project.time_created.toDate?.() || project.time_created).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                          <Badge variant={project.status === 'confirmed' ? 'default' : 'outline'} className="text-sm px-3 py-1">
                            {project.status === 'confirmed' ? 'Confirmed' : 'Quote'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 text-muted/50" />
                  <p>No projects or quotes have been created for this ticket yet.</p>
                </CardContent>
              </Card>
            )}
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
