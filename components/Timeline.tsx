'use client';

import { useEffect, useState, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  addDoc,
  serverTimestamp,
  DocumentReference,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, FileText, Send, Ticket, User } from "lucide-react";

interface TimelineEntry {
  id: string;
  company: DocumentReference;
  generated_by: DocumentReference;
  user?: DocumentReference;
  note?: string;
  time_created: Timestamp;
  time_updated: Timestamp;
  timeline: DocumentReference;
  type: string;
}

interface TimelineProps {
  timelineId: string;
  companyId: string;
  generatedById: string; // The ID of the project or ticket the user is currently on
  generatedByType: 'projects' | 'tickets'; // The collection to create the reference in
}

interface TimelineItemProps {
  entry: TimelineEntry;
}

function TimelineItem({ entry }: TimelineItemProps) {
  const [generatorLabel, setGeneratorLabel] = useState<string>("System");
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      if (!entry.generated_by) {
        setLoadingContext(false);
        return;
      }
      
      try {
        // Find reference whether it's a string path or a DocumentReference
        const docRef = typeof entry.generated_by === 'string' 
          ? doc(db, entry.generated_by) 
          : entry.generated_by;
          
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const docPath = docRef.path || "";
          
          if (docPath.includes("tickets/")) {
            setGeneratorLabel(`${data.number || '??'}`);
          } else if (docPath.includes("projects/")) {
            setGeneratorLabel(`${data.number || '??'}`);
          } else if (docPath.includes("users/")) {
            const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
            setGeneratorLabel(`User ${fullName || data.email || '??'}`);
          } else {
            setGeneratorLabel(`Company Data`);
          }
        }

        // Fetch user reference if it exists separately
        if (entry.user) {
          const userRef = typeof entry.user === 'string' 
            ? doc(db, entry.user) 
            : entry.user;
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const fullName = [userData.first_name, userData.last_name].filter(Boolean).join(" ");
            setUserLabel(fullName || userData.email || 'Unknown User');
          }
        }
      } catch (err) {
        console.error("Error fetching event generator context:", err);
      } finally {
        setLoadingContext(false);
      }
    }
    
    fetchContext();
  }, [entry.generated_by, entry.user]);

  const generatedByPath = entry.generated_by?.path || (typeof entry.generated_by === 'string' ? entry.generated_by : "");
  let GeneratorIcon = User;
  if (generatedByPath.includes("tickets/")) GeneratorIcon = Ticket;
  else if (generatedByPath.includes("projects/")) GeneratorIcon = Building2; // Example icon for projects
  else if (generatedByPath.includes("companies/")) GeneratorIcon = Building2;

  return (
    <div className="relative">
      {/* Timeline dot (unfilled, perfectly centered with the line) */}
      <div className="absolute -left-6 top-1 h-4 w-4 rounded-full border-[3px] border-primary bg-background ring-4 ring-background z-10" />
      
      <div className="flex flex-col gap-2">
        {/* Event Header: generated_by tag & Timestamp */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full w-max">
            <GeneratorIcon className="w-3.5 h-3.5" />
            {loadingContext ? "Loading..." : generatorLabel}
          </div>
          
          <div className="text-xs text-muted-foreground shrink-0">
            {entry.time_created ? entry.time_created.toDate().toLocaleString() : 'Saving...'}
          </div>
        </div>
        
        {/* Event Body */}
        {entry.type === "note" && entry.note ? (
          <div className="bg-muted/30 p-3.5 rounded-lg border text-sm">
            <div className="flex gap-2.5 items-start text-foreground">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="leading-relaxed whitespace-pre-wrap">{entry.note}</span>
            </div>
            {userLabel && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {userLabel}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {entry.note || <span className="capitalize">{entry.type.replace('_', ' ')} Event</span>}
            {userLabel && (
              <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {userLabel}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Timeline({ timelineId, companyId, generatedById, generatedByType }: TimelineProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to the timeline's entries
  useEffect(() => {
    let unsubscribeEvents: () => void;

    const fetchTimeline = async () => {
      try {
        const tRef = doc(db, "timelines", timelineId);

        const qEntries = query(
          collection(db, "timeline_entries"),
          where("timeline", "==", tRef),
          orderBy("time_created", "asc")
        );

        unsubscribeEvents = onSnapshot(qEntries, (snapshot) => {
          const eventsData = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as TimelineEntry[];
          setEntries(eventsData);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error fetching timeline data:", err);
        setLoading(false);
      }
    };

    fetchTimeline();

    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [timelineId]);

  // Auto-scroll to bottom when entries change or load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !timelineId) return;

    try {
      const companyRef = doc(db, "companies", companyId);
      const generatedByRef = doc(db, generatedByType, generatedById);
      const timelineRef = doc(db, "timelines", timelineId);

      const entryData: any = {
        company: companyRef,
        generated_by: generatedByRef,
        note: newNote,
        time_created: serverTimestamp(),
        time_updated: serverTimestamp(),
        timeline: timelineRef,
        type: "note"
      };

      if (user) {
        entryData.user = doc(db, "users", user.uid);
      }

      await addDoc(collection(db, "timeline_entries"), entryData);
      
      setNewNote("");
    } catch (err) {
      console.error("Error adding note:", err);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground animate-pulse">Loading timeline events...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-card text-card-foreground overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-lg">Timeline</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        {entries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No events yet.</p>
        ) : (
          <div className="relative pl-8 space-y-8">
            {/* Thicker vertical line perfectly aligned with dots */}
            <div className="absolute left-[14px] top-2 bottom-2 w-1 bg-border rounded-full -z-0"></div>
            
            {entries.map((entry) => (
              <TimelineItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-muted/10">
        <form onSubmit={handleAddNote} className="flex items-center gap-3">
          <Input 
            placeholder="Add a note..." 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 bg-background"
          />
          <Button type="submit" disabled={!newNote.trim() || !timelineId}>
            <Send className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </form>
      </div>
    </div>
  );
}