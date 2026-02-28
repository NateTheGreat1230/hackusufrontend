"use client";

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
// Added 'doc' to create the company reference
import { collection, onSnapshot, query, addDoc, doc } from 'firebase/firestore';
import { Loader2, Plus, X } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types";

export default function CustomersPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Modal & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Basic Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");

  // Address Info
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the payload matching your Firebase structure exactly
      await addDoc(collection(db, "customers"), {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        company_name: companyName,
        notes: notes,
        address: {
          street_1: street1,
          street_2: street2,
          city: city,
          state: state,
          zip: zip,
          country: country
        },
        balance: 0, // Initialized to 0
        company: doc(db, "companies", company), // Creates the document reference
        time_created: new Date(),
        time_updated: new Date()
      });

      // Reset form
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); 
      setCompanyName(""); setNotes(""); setStreet1(""); setStreet2(""); 
      setCity(""); setState(""); setZip(""); setCountry("");
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding customer:", error);
      alert("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <span className="font-semibold text-slate-900">
          {item.first_name || item.last_name 
            ? `${item.first_name || ''} ${item.last_name || ''}`.trim() 
            : item.name || 'Unknown'}
        </span>
      )
    },
    {
      header: "Email",
      key: "email",
      className: "text-sm text-slate-600",
    },
    {
      header: "Phone",
      key: "phone",
      className: "text-sm text-slate-600",
    },
    {
      header: "Company Name",
      key: "company_name",
      className: "text-sm text-slate-600",
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
          
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Manage your customers.
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)} 
              className="cursor-pointer shrink-0 ml-4"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </div>

          <DataTable 
            columns={columns}
            data={filteredData}
            onRowClick={(item: Customer) => router.push(`/${company}/customer/${item.id}`)}
            emptyMessage={searchQuery ? `No customers found matching "${searchQuery}".` : "No customers found."}
          />
        </div>
      </div>

      {/* --- Add Customer Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Made max-w-2xl and added max-h & flex-col so it handles scrolling nicely */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-lg text-slate-800">Add New Customer</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Form area is now scrollable (overflow-y-auto) */}
            <form onSubmit={handleAddCustomer} className="p-6 overflow-y-auto space-y-6">
              
              {/* Personal Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Personal Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">First Name</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Last Name</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Doe" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Company Name</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="jane@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="(555) 123-4567" />
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-4">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Street 1</label>
                    <input type="text" value={street1} onChange={(e) => setStreet1(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="123 Main St" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Street 2</label>
                    <input type="text" value={street2} onChange={(e) => setStreet2(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Apt 4B" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">City</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Springfield" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">State</label>
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="IL" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Zip Code</label>
                    <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="12345" />
                  </div>
                </div>

                <div className="space-y-2 w-1/2 pr-2">
                  <label className="text-sm font-medium text-slate-700">Country</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="USA" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[80px]" 
                    placeholder="Any additional details..." 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6 shrink-0 pb-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Save Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}