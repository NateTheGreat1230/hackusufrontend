import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomerSelectionFormProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  filteredCustomers: any[];
  onSelectCustomer: (id: string, name?: string) => void;
  newCustomerTrigger?: React.ReactNode; 
}

export function CustomerSelectionForm({
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  filteredCustomers,
  onSelectCustomer,
  newCustomerTrigger
}: CustomerSelectionFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Search customers by name or email..." 
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          className="flex-1"
        />
        {newCustomerTrigger}
      </div>
      <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
        {filteredCustomers.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">No customers found.</div>
        ) : (
          filteredCustomers.map(c => (
            <div key={c.id} className="flex justify-between items-center p-2 hover:bg-muted rounded-md border bg-card">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {(c.first_name || c.last_name) ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : (c.name || 'Unknown User')}
                </p>
                {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => onSelectCustomer(c.id, (c.first_name || c.last_name) ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : c.name)} className="cursor-pointer">
                Select
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
