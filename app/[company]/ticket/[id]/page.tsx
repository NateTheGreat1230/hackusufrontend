import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = await params;

  // Fetch the ticket to get its timeline reference
  const ticketRef = doc(db, "tickets", id);
  const ticketSnap = await getDoc(ticketRef);
  const ticketData = ticketSnap.data();

  // Assuming the ticket has a reference to the timeline
  const timelineId = ticketData?.timeline?.id;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Main ticket content will go here */}
        <h1 className="text-2xl font-bold mb-4">Ticket {id}</h1>
      </div>

      <aside className="w-[550px] flex-shrink-0 bg-background h-full overflow-hidden">
        {timelineId ? (
          <Timeline 
            companyId={company} 
            timelineId={timelineId} 
            generatedById={id} 
            generatedByType="tickets" 
          />
        ) : (
          <div className="p-4 text-sm text-muted-foreground border-l h-full">No timeline attached to this ticket.</div>
        )}
      </aside>
    </div>
  );
}