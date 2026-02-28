"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, where } from 'firebase/firestore';
import { Users, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";

interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  company?: any;
}

export default function CustomersPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    const q = query(
      collection(db, "customers"),
      where("company", "==", doc(db, "companies", company))
    );
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
                <Users className="text-blue-600" />
                Customers
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage your customers.</p>
            </div>
          </div>

          <DataTable 
            columns={columns}
            data={data}
            searchPlaceholder="Search customers..."
            searchKey={(item: Customer) => `${item.first_name || ''} ${item.last_name || ''} ${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.company_name || ''}`}
            onRowClick={(item: Customer) => router.push(`/${company}/customer/${item.id}`)}
            emptyMessage="No customers found."
          />
        </div>
      </div>
    </div>
  );
}