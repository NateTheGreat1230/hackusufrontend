import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TicketSelectionFormProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  filteredTickets: any[];
  onSelectTicket: (id: string, ticketNumber?: string) => void;
  newTicketTrigger?: React.ReactNode; 
}

export function TicketSelectionForm({
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  filteredTickets,
  onSelectTicket,
  newTicketTrigger
}: TicketSelectionFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Search tickets by number or request..." 
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          className="flex-1"
        />
        {newTicketTrigger}
      </div>
      <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
        {filteredTickets.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">No tickets found.</div>
        ) : (
          filteredTickets.map(t => (
            <div key={t.id} className="flex justify-between items-center p-2 hover:bg-muted rounded-md border bg-card">
              <div className="min-w-0 flex-1 pr-4">
                <p className="font-medium text-sm truncate text-blue-600">
                  {t.number || 'Unknown Ticket'}
                </p>
                {t.request && (
                  <p className="text-xs text-muted-foreground truncate">
                    {t.request}
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => onSelectTicket(t.id, t.number)} 
                className="cursor-pointer shrink-0"
              >
                Select
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}