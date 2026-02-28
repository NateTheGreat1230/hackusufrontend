"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
// 1. ADD useSearchParams HERE
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";

// Notice: We don't even need to worry about the Project type right here if we just use the fields we know exist!
import { Project } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  // 2. INITIALIZE the search params hook
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all projects uniformly
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

  // 3. FILTER USING searchQuery
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;

    const searchString = `${item.number || ''} ${item.status || ''}`.toLowerCase();
    
    return searchString.includes(searchQuery);
  });

  const columns = [
    {
      header: "Project #",
      key: "number",
      render: (item: Project) => (
        <span className="font-semibold text-blue-600">
          {item.number || '---'}
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
          
          {/* 4. Action Bar with Description */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Manage projects and quotes.
            </p>
            {/* If you ever add a "Create Project" button, put it right here! */}
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