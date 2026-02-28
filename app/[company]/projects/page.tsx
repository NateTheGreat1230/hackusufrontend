"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";

// Notice: We don't even need to worry about the Project type right here if we just use the fields we know exist!
import { Project } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    return () => unsubscribe();
  }, [company]);

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;

    // We only search by number and status now since name doesn't exist
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
          </div>

          <DataTable 
            columns={columns}
            data={filteredData}
            onRowClick={(item: Project) => router.push(`/${company}/project/${item.id}`)}
            emptyMessage={searchQuery ? `No projects found matching "${searchQuery}".` : "No projects found."}
          />
        </div>
      </div>
    </div>
  );
}