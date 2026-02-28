"use client";

import { use, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pen, Check, X, Mail, Phone, MapPin, Building, User, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CustomerPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = use(params);
  const router = useRouter();

  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "customers", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setCustomerData(data);
      } else {
        setCustomerData(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const handleEditClick = () => {
    setEditForm({
      first_name: customerData.first_name || "",
      last_name: customerData.last_name || "",
      company_name: customerData.company_name || "",
      email: customerData.email || "",
      phone: customerData.phone || "",
      notes: customerData.notes || "",
      balance: customerData.balance || 0,
      address: {
        street_1: customerData.address?.street_1 || "",
        street_2: customerData.address?.street_2 || "",
        city: customerData.address?.city || "",
        state: customerData.address?.state || "",
        zip: customerData.address?.zip || "",
        country: customerData.address?.country || ""
      }
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const customerRef = doc(db, "customers", id);
    await updateDoc(customerRef, {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      company_name: editForm.company_name,
      email: editForm.email,
      phone: editForm.phone,
      notes: editForm.notes,
      balance: Number(editForm.balance) || 0,
      address: editForm.address
    });
    setIsEditing(false);
  };

  const handleAddressChange = (field: string, value: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  if (loading) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Loading customer details...</div>;
  if (!customerData) return <div className="p-8 text-muted-foreground flex h-full items-center justify-center">Customer not found or deleted.</div>;

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {customerData.first_name || customerData.last_name ? `${customerData.first_name || ''} ${customerData.last_name || ''}` : customerData.company_name || "Unknown Customer"}
              </h1>
              <p className="text-muted-foreground mt-1">Customer Details</p>
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit} className="cursor-pointer">
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} className="cursor-pointer bg-green-600 hover:bg-green-700 text-white">
                    <Check className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={handleEditClick} variant="outline" className="cursor-pointer">
                  <Pen className="w-4 h-4 mr-2" /> Edit Customer
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">First Name</label>
                        <Input 
                          value={editForm.first_name} 
                          onChange={(e) => setEditForm({...editForm, first_name: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                        <Input 
                          value={editForm.last_name} 
                          onChange={(e) => setEditForm({...editForm, last_name: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                        <div className="flex gap-2 items-center">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <Input 
                            value={editForm.company_name} 
                            onChange={(e) => setEditForm({...editForm, company_name: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Balance</label>
                        <Input 
                          type="number"
                          value={editForm.balance} 
                          onChange={(e) => setEditForm({...editForm, balance: parseFloat(e.target.value) || 0})} 
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">First Name</div>
                        <div className="font-medium">{customerData.first_name || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Last Name</div>
                        <div className="font-medium">{customerData.last_name || "-"}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" /> Company Name
                        </div>
                        <div className="font-medium">{customerData.company_name || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                           Balance
                        </div>
                        <div className={`font-medium ${customerData.balance < 0 ? 'text-red-500' : customerData.balance > 0 ? 'text-green-500' : ''}`}>
                          ${(customerData.balance || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <Input 
                        type="email"
                        value={editForm.email} 
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Phone</label>
                      <Input 
                        value={editForm.phone} 
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})} 
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </div>
                      <div className="font-medium">
                        {customerData.email ? (
                          <a href={`mailto:${customerData.email}`} className="text-blue-600 hover:underline">
                            {customerData.email}
                          </a>
                        ) : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Phone
                      </div>
                      <div className="font-medium">
                        {customerData.phone ? (
                          <a href={`tel:${customerData.phone}`} className="text-blue-600 hover:underline">
                            {customerData.phone}
                          </a>
                        ) : "-"}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4 w-full max-w-2xl">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Street 1</label>
                      <Input value={editForm.address?.street_1} onChange={(e) => handleAddressChange('street_1', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Street 2 (Optional)</label>
                      <Input value={editForm.address?.street_2} onChange={(e) => handleAddressChange('street_2', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">City</label>
                        <Input value={editForm.address?.city} onChange={(e) => handleAddressChange('city', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">State</label>
                        <Input value={editForm.address?.state} onChange={(e) => handleAddressChange('state', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">ZIP</label>
                        <Input value={editForm.address?.zip} onChange={(e) => handleAddressChange('zip', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5 max-w-xs">
                      <label className="text-xs font-medium text-muted-foreground">Country</label>
                      <Input value={editForm.address?.country} onChange={(e) => handleAddressChange('country', e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    {customerData.address?.street_1 ? (
                      <div className="space-y-1">
                        <div>{customerData.address.street_1}</div>
                        {customerData.address.street_2 && <div>{customerData.address.street_2}</div>}
                        <div>
                          {customerData.address.city}{customerData.address.city && customerData.address.state ? ", " : ""}
                          {customerData.address.state} {customerData.address.zip}
                        </div>
                        {customerData.address.country && <div>{customerData.address.country}</div>}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No address provided.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea 
                    className="min-h-[120px]"
                    placeholder="Add customer notes..."
                    value={editForm.notes} 
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})} 
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">
                    {customerData.notes ? customerData.notes : <span className="text-muted-foreground">No notes available.</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
