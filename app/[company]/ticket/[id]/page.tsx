import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Phone, Mail, Building, FileText, CheckCircle2, CircleDashed } from "lucide-react";
import Link from "next/link";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = await params;

  // Fetch the ticket
  const ticketRef = doc(db, "tickets", id);
  const ticketSnap = await getDoc(ticketRef);
  const ticketData = ticketSnap.data() || {};

  // Fetch the customer
  let customerData: any = null;
  if (ticketData.customer) {
    try {
      const customerRef = typeof ticketData.customer === 'string' 
        ? doc(db, ticketData.customer)
        : ticketData.customer;
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        customerData = { id: customerSnap.id, ...(customerSnap.data() as object) };
      }
    } catch (e) {
      console.error("Failed to fetch customer", e);
    }
  }

  // Fetch associated projects
  let projects: any[] = [];
  try {
    const qProjects = query(collection(db, "projects"), where("ticket", "==", ticketRef));
    const projectsSnap = await getDocs(qProjects);
    projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Failed to fetch projects", e);
  }

  // Assume project status defines the ticket "Won" state
  const hasConfirmedProject = projects.some(p => p.status === 'confirmed');
  const displayStatus = hasConfirmedProject ? 'Won' : (ticketData.status || 'Open');

  // Assuming the ticket has a reference to the timeline
  const timelineId = ticketData?.timeline?.id || ticketData?.timeline;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
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
            <Badge variant={displayStatus === 'Won' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {displayStatus === 'Won' && <CheckCircle2 className="w-4 h-4 mr-2" />}
              {displayStatus === 'Open' && <CircleDashed className="w-4 h-4 mr-2" />}
              {displayStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {customerData.email}
                      </div>
                    )}
                    {customerData.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {customerData.phone}
                      </div>
                    )}
                    {customerData.company_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        {customerData.company_name}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No customer linked to this ticket.</p>
                )}
              </CardContent>
            </Card>

            {/* Request Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Request Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Original Request</div>
                    <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap border">
                      {ticketData.request || ticketData.description || ticketData.note || "No request details provided."}
                    </div>
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
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Associated Projects & Quotes</h2>
              <p className="text-sm text-muted-foreground">Projects created from this lead.</p>
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
                  <FileText className="w-10 h-10 mb-3 text-muted" />
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