import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Pen, Mail, Phone, Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerSelectionForm } from "./CustomerSelectionForm";
import { CustomerCreationForm } from "./CustomerCreationForm";
import React from "react";

interface CustomerDetailsBoxProps {
  customerData: any;
  isCustomerDialogOpen: boolean;
  setIsCustomerDialogOpen: (open: boolean) => void;
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  filteredCustomers: any[];
  handleSelectNewCustomer: (id: string, name?: string) => void;
  isNewCustomerDialogOpen: boolean;
  setIsNewCustomerDialogOpen: (open: boolean) => void;
  newCustomerForm: any;
  setNewCustomerForm: (form: any) => void;
  handleCreateNewCustomer: () => void;
}

export function CustomerDetailsBox({
  customerData,
  isCustomerDialogOpen,
  setIsCustomerDialogOpen,
  customerSearch,
  setCustomerSearch,
  handleSearchKeyDown,
  filteredCustomers,
  handleSelectNewCustomer,
  isNewCustomerDialogOpen,
  setIsNewCustomerDialogOpen,
  newCustomerForm,
  setNewCustomerForm,
  handleCreateNewCustomer
}: CustomerDetailsBoxProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" /> Customer Details
        </CardTitle>
        <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
              <Pen className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Customer</DialogTitle>
              <DialogDescription>Search and select a different customer.</DialogDescription>
            </DialogHeader>
            
            <CustomerSelectionForm
              searchQuery={customerSearch}
              onSearchChange={setCustomerSearch}
              onSearchKeyDown={handleSearchKeyDown}
              filteredCustomers={filteredCustomers}
              onSelectCustomer={handleSelectNewCustomer}
              newCustomerTrigger={
                <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="outline" title="Create New Customer" className="cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Customer</DialogTitle>
                      <DialogDescription>Add a new customer to link to this record.</DialogDescription>
                    </DialogHeader>
                    <CustomerCreationForm
                      form={newCustomerForm}
                      onChange={setNewCustomerForm}
                      onCancel={() => setIsNewCustomerDialogOpen(false)}
                      onCreate={handleCreateNewCustomer}
                    />
                  </DialogContent>
                </Dialog>
              }
            />

          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4 mt-2">
        {customerData ? (
          <>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="font-medium">
                {(customerData.first_name || customerData.last_name) 
                  ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim()
                  : (customerData.name || 'Unknown')}
              </div>
            </div>
            {customerData.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{customerData.email}</span>
              </div>
            )}
            {customerData.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{customerData.phone}</span>
              </div>
            )}
            {customerData.company_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{customerData.company_name}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No customer linked.</p>
        )}
      </CardContent>
    </Card>
  );
}
