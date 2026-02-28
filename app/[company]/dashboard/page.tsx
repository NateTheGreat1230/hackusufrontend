"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, orderBy, limit } from "firebase/firestore";
import { Loader2, Ticket, Building2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { DataTable } from "@/components/DataTable";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;

  const [tickets, setTickets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;

    const userRef = doc(db, "users", user.uid);

    // Fetch assigned tickets (recent 5)
    // In order to order and limit, we need an index most likely, so let's just fetch assigned and sort in JS, or not order. 
    // Since we don't want to create composite indexes manually without checking, let's just do array-contains.
    const qTickets = query(
      collection(db, "tickets"),
      where("assigned_users", "array-contains", userRef)
    );

    const unsubTickets = onSnapshot(qTickets, (snap) => {
      let result = snap.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as any[];
      // Sort by time_created desc
      result.sort((a, b) => {
        const timeA = a.time_created?.toMillis?.() || 0;
        const timeB = b.time_created?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setTickets(result);
      setLoadingTickets(false);
    });

    const qProjects = query(
      collection(db, "projects"),
      where("assigned_users", "array-contains", userRef)
    );

    const unsubProjects = onSnapshot(qProjects, (snap) => {
      let result = snap.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as any[];
      // Sort by time_created desc
      result.sort((a, b) => {
        const timeA = a.time_created?.toMillis?.() || 0;
        const timeB = b.time_created?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setProjects(result);
      setLoadingProjects(false);
    });

    return () => {
      unsubTickets();
      unsubProjects();
    };
  }, [user, authLoading, company]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-muted/10 min-h-screen">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        Please log in to access the dashboard.
      </div>
    );
  }

  const ticketColumns = [
    {
      header: "Ticket #",
      key: "number",
      render: (item: any) => (
        <span className="font-semibold text-blue-600">
          {item.number ? item.number : item.id.substring(0,6)}
        </span>
      )
    },
    {
      header: "Status",
      key: "status",
      className: "text-right",
      render: (item: any) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "open"}
        </span>
      )
    }
  ];

  const projectColumns = [
    {
      header: "Project #",
      key: "number",
      render: (item: any) => (
        <span className="font-semibold text-blue-600">
          {item.number ? item.number : item.id.substring(0,6)}
        </span>
      )
    },
    {
      header: "Status",
      key: "status",
      className: "text-right",
      render: (item: any) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "draft"}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col flex-1 w-full bg-muted/10 h-full overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.first_name || user.email}! Here is an overview of your assigned tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Assigned Tickets */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
            <div className="p-5 border-b bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-600" />
                My Assigned Tickets
              </h2>
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {tickets.length} Active
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingTickets ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="animate-spin mb-2" size={24} />
                </div>
              ) : (
                <DataTable 
                  columns={ticketColumns}
                  data={tickets}
                  onRowClick={(item: any) => router.push(`/${company}/ticket/${item.id}`)}
                  emptyMessage="You have no assigned tickets."
                  hideHeader={true}
                />
              )}
            </div>
          </div>

          {/* Assigned Projects */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
            <div className="p-5 border-b bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                My Assigned Projects
              </h2>
              <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {projects.length} Active
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingProjects ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="animate-spin mb-2" size={24} />
                </div>
              ) : (
                <DataTable 
                  columns={projectColumns}
                  data={projects}
                  onRowClick={(item: any) => router.push(`/${company}/project/${item.id}`)}
                  emptyMessage="You have no assigned projects."
                  hideHeader={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
