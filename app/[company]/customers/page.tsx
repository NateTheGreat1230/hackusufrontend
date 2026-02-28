"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
// 1. ADD useSearchParams HERE
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";
import { Customer } from "@/types";

export default function CustomersPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  // 2. INITIALIZE the search params hook
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all customers to avoid missing records due to missing/invalid company refs
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as Customer[];
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

    const searchString = `${item.first_name || ''} ${item.last_name || ''} ${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.company_name || ''}`.toLowerCase();
    
    return searchString.includes(searchQuery);
  });

  const columns = [
    {
      header: "Name",
      key: "name",
      render: (item: Customer) => (
        <span className="font-semibold">
          {item.first_name || item.last_name 
            ? `${item.first_name || ''} ${item.last_name || ''}`.trim() 
            : item.name || 'Unknown'}
        </span>
      )
    },
    {
      header: "Email",
      key: "email",
      className: "text-sm",
    },
    {
      header: "Phone",
      key: "phone",
      className: "text-sm",
    },
    {
      header: "Company Name",
      key: "company_name",
      className: "text-sm",
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/10 h-screen w-full">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading customers...</p>
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
              Manage your customers.
            </p>
            {/* If you ever add an "Add Customer" button, it goes right here! */}
          </div>

          <DataTable 
            columns={columns}
            // 5. PASS FILTERED DATA AND CLEAN UP PROPS
            data={filteredData}
            onRowClick={(item: Customer) => router.push(`/${company}/customer/${item.id}`)}
            emptyMessage={searchQuery ? `No customers found matching "${searchQuery}".` : "No customers found."}
          />
        </div>
      </div>
    </div>
  );
}