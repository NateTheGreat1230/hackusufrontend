import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getCountFromServer } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderGit2, Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface ProjectManagerProps {
  companyId: string;
  ticketId: string;
  ticketData: any;
  logEvent?: (note: string, type?: string) => Promise<void>;
}

export function ProjectManager({ companyId, ticketId, ticketData, logEvent }: ProjectManagerProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!ticketId) return;
    const ticketRef = doc(db, "tickets", ticketId);
    const qProjects = query(collection(db, "projects"), where("ticket", "==", ticketRef));
    const unsubscribe = onSnapshot(qProjects, (snap) => {
      const projs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      projs.sort((a: any, b: any) => {
        const da = a.time_created?.toMillis?.() || 0;
        const db = b.time_created?.toMillis?.() || 0;
        return db - da;
      });
      setProjects(projs);
    });
    
    return () => unsubscribe();
  }, [ticketId]);

  const handleCreateProject = async () => {
    const qProjectsCount = query(collection(db, "projects"), where("company", "==", doc(db, "companies", companyId)));
    const snapshot = await getCountFromServer(qProjectsCount);
    const count = snapshot.data().count;
    const newProjectNumber = 1000 + count + 1;

    const ticketRef = doc(db, "tickets", ticketId);
    const newProjectRef = await addDoc(collection(db, "projects"), {
      amount: 0,
      amount_due: 0,
      company: doc(db, "companies", companyId),
      customer: ticketData.customer || null,
      assigned_users: ticketData.assigned_users || [],
      invoices: [],
      line_items: [],
      number: newProjectNumber,
      status: "draft",
      ticket: ticketRef,
      time_created: serverTimestamp(),
      time_updated: serverTimestamp(),
      timeline: ticketData.timeline || null,
    });

    if (logEvent) {
      await logEvent(`User created Project ${newProjectNumber}.`, "project_created");
    }

    router.push(`/${companyId}/project/${newProjectRef.id}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-gray-800" /> Projects
        </CardTitle>
        <Button size="sm" onClick={handleCreateProject} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" /> Create Project
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No projects have been created for this ticket yet.
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(proj => (
              <div 
                key={proj.id} 
                className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/${companyId}/project/${proj.id}`)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-blue-600 hover:underline">
                    {proj.number ? proj.number : `Project #${proj.id.slice(0,6)}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                     {new Date(proj.time_created?.toMillis?.() || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={['open', 'completed'].includes(proj.status?.toLowerCase()) ? 'default' : 'outline'} className="text-sm px-3 py-1">
                    {['open', 'completed'].includes(proj.status?.toLowerCase()) ? 'Active' : 'Draft'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/${companyId}/project/${proj.id}`); }} className="cursor-pointer">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
