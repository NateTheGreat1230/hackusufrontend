"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, where } from 'firebase/firestore';
import { Ticket, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";

interface TicketItem {
  id: string;
  number?: number;
  request?: string;
  status?: string;
  customer?: any;
  time_created?: any;
}

export default function TicketsPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const [data, setData] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    const q = query(
      collection(db, "tickets"),
      where("company", "==", doc(db, "companies", company))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as TicketItem[];
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
      header: "Ticket #",
      key: "number",
      render: (item: TicketItem) => (
        <span className="font-semibold text-blue-600">
          #{item.number || '---'}
        </span>
      )
    },
    {
      header: "Request",
      key: "request",
      className: "max-w-[300px] truncate",
      render: (item: TicketItem) => item.request || "No description"
    },
    {
      header: "Status",
      key: "status",
      render: (item: TicketItem) => (
        <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border">
          {item.status || "open"}
        </span>
      )
    },
    {
      header: "Created Date",
      key: "time_created",
      className: "text-sm text-muted-foreground",
      render: (item: TicketItem) => item.time_created?.toDate 
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
                <Ticket className="text-blue-600" />
                Tickets
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage customer requests and tickets.</p>
            </div>
          </div>

          <DataTable 
            columns={columns}
            data={data}
            searchPlaceholder="Search tickets..."
            searchKey={(item: TicketItem) => `${item.number || ''} ${item.request || ''} ${item.status || ''}`}
            onRowClick={(item: TicketItem) => router.push(`/${company}/ticket/${item.id}`)}
            emptyMessage="No tickets found."
          />
        </div>
      </div>
    </div>
  );
}