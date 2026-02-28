"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, where } from 'firebase/firestore';
import { FileText, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";

interface InvoiceItem {
  id: string;
  number?: string | number;
  status?: string;
  total?: number;
  amount?: number;
  time_created?: any;
}

export default function InvoicesPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const [data, setData] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    const q = query(
      collection(db, "invoices"),
      where("company", "==", doc(db, "companies", company))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(val => ({
        id: val.id,
        ...val.data()
      })) as InvoiceItem[];
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
      header: "Invoice #",
      key: "number",
      render: (item: InvoiceItem) => (
        <span className="font-semibold text-blue-600">
          {item.number ? `#${item.number}` : '---'}
        </span>
      )
    },
    {
      header: "Status",
      key: "status",
      render: (item: InvoiceItem) => (
        <span className={`capitalize px-2 py-1 bg-muted rounded-md text-xs font-medium border ${
          item.status === 'paid' ? 'bg-green-100/50 text-green-700 border-green-200' :
          item.status === 'overdue' ? 'bg-red-100/50 text-red-700 border-red-200' : ''
        }`}>
          {item.status || "draft"}
        </span>
      )
    },
    {
      header: "Amount",
      key: "amount",
      render: (item: InvoiceItem) => (
        <span className="font-medium">
          ${(item.total || item.amount || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: "Created Date",
      key: "time_created",
      className: "text-sm text-muted-foreground",
      render: (item: InvoiceItem) => item.time_created?.toDate 
        ? item.time_created.toDate().toLocaleDateString() 
        : "Unknown"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/10 h-screen w-full">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-sm font-medium">Loading invoices...</p>
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
                <FileText className="text-blue-600" />
                Invoices
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage your billing and invoices.</p>
            </div>
          </div>

          <DataTable 
            columns={columns}
            data={data}
            searchPlaceholder="Search invoices..."
            searchKey={(item: InvoiceItem) => `${item.number || ''} ${item.status || ''}`}
            onRowClick={(item: InvoiceItem) => router.push(`/${company}/invoice/${item.id}`)}
            emptyMessage="No invoices found."
          />
        </div>
      </div>
    </div>
  );
}

// Helper component for Payment Status
const PaymentBadge = ({ amountDue }: { amountDue: number }) => {
  if (amountDue <= 0) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
      <CheckCircle size={12} /> Paid
    </span>
  );
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold uppercase tracking-wider">
      <Clock size={12} /> Pending (${amountDue.toFixed(2)})
    </span>
  );
};

export default InvoiceManager;