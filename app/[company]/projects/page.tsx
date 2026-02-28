"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, where } from 'firebase/firestore';
import { Briefcase, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";

interface ProjectItem {
  id: string;
  number?: string | number;
  name?: string;
  status?: string;
  cost?: number;
  time_created?: any;
}

export default function ProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const [data, setData] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    const q = query(
      collection(db, "projects"),
      where("company", "==", doc(db, "companies", company))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as ProjectItem[];
      setData(result);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [company]);

  const columns = [
    {
      header: "Project #",
      key: "number",
      render: (item: ProjectItem) => (
        <span className="font-semibold text-blue-600">
          {item.number ? `#${item.number}` : '---'}
        </span>
      )
    },
    {
      header: "Name",
      key: "name",
      className: "font-medium",
      render: (item: ProjectItem) => item.name || "Unnamed Project"
    },
    {
      header: "Status",
      key: "status",
      render: (item: ProjectItem) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "quote"}
        </span>
      )
    },
    {
      header: "Cost",
      key: "cost",
      render: (item: ProjectItem) => (
        <span className="text-sm text-muted-foreground">
          ${(item.cost || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: "Created Date",
      key: "time_created",
      className: "text-sm text-muted-foreground",
      render: (item: ProjectItem) => item.time_created?.toDate 
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
                <Briefcase className="text-blue-600" />
                Projects
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage projects and quotes.</p>
            </div>
          </div>

          <DataTable 
            columns={columns}
            data={data}
            searchPlaceholder="Search projects..."
            searchKey={(item: ProjectItem) => `${item.number || ''} ${item.name || ''} ${item.status || ''}`}
            onRowClick={(item: ProjectItem) => router.push(`/${company}/project/${item.id}`)}
            emptyMessage="No projects found."
          />
        </div>
      </div>
    </div>
  );
}