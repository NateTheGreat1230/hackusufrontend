"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
// 1. ADD useSearchParams HERE
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";
import { Ticket } from "@/types";

export default function TicketsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  // 2. INITIALIZE the search params hook
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all tickets uniformly
    const q = query(collection(db, "tickets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as Ticket[];
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

    const searchString = `${item.number || ''} ${item.request || ''} ${item.status || ''}`.toLowerCase();
    
    return searchString.includes(searchQuery);
  });

  const columns = [
    {
      header: "Ticket #",
      key: "number",
      render: (item: Ticket) => (
        <span className="font-semibold text-blue-600">
          #{item.number || '---'}
        </span>
      )
    },
    {
      header: "Request",
      key: "request",
      className: "max-w-[300px] truncate",
      render: (item: Ticket) => item.request || "No description"
    },
    {
      header: "Status",
      key: "status",
      render: (item: Ticket) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "open"}
        </span>
      )
    },
    {
      header: "Created Date",
      key: "time_created",
      className: "text-sm text-muted-foreground",
      render: (item: Ticket) => item.time_created?.toDate 
        ? item.time_created.toDate().toLocaleDateString() 
        : "Unknown"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/10 h-screen w-full">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading tickets...</p>
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
              Manage customer requests and tickets.
            </p>
            {/* Add a "Create Ticket" button here later if needed! */}
          </div>

          <DataTable 
            columns={columns}
            // 5. PASS FILTERED DATA AND CLEAN UP PROPS
            data={filteredData}
            onRowClick={(item: Ticket) => router.push(`/${company}/ticket/${item.id}`)}
            emptyMessage={searchQuery ? `No tickets found matching "${searchQuery}".` : "No tickets found."}
          />
        </div>
      </div>
    </div>
  );
}