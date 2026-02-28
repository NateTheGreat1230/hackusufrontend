"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, DocumentReference } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Briefcase } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AssigneeSelectorProps {
  company: string;
  docRef: DocumentReference;
  currentAssignees: (DocumentReference | string)[];
  logEvent: (note: string, type: string) => Promise<void>;
}

export function AssigneeSelector({ company, docRef, currentAssignees = [], logEvent }: AssigneeSelectorProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigneeData, setAssigneeData] = useState<any[]>([]);

  // Fetch all users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      // In a real app we'd filter by company, but might be string or ref
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(allUsers);
      setLoading(false);
    });
    return () => unsub();
  }, [company]);

  // Resolve current assignees
  useEffect(() => {
    const resolveAssignees = () => {
      const safeAssignees = Array.isArray(currentAssignees) ? currentAssignees.filter(Boolean) : [];
      const resolved = safeAssignees.map(ref => {
        const userId = typeof ref === 'string' ? ref.split('/').pop() : ref.id;
        if (!userId) return null;
        const found = users.find(u => u.id === userId);
        return { ref, id: userId, data: found };
      }).filter(Boolean);
      setAssigneeData(resolved);
    };
    if (!loading) {
      resolveAssignees();
    }
  }, [currentAssignees, users, loading]);

  const handleAssign = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const userRef = doc(db, "users", userId);
    
    // Check if already assigned
    if (assigneeData.some(a => a.id === userId)) return;

    await updateDoc(docRef, {
      assigned_users: arrayUnion(userRef)
    });
    await logEvent(`Assigned user ${user.first_name || user.email || userId} to this item.`, "user_assigned");
  };

  const handleRemove = async (userRef: any, userId: string) => {
    const user = users.find(u => u.id === userId);
    await updateDoc(docRef, {
      assigned_users: arrayRemove(userRef)
    });
    await logEvent(`Removed user ${user?.first_name || user?.email || userId} from this item.`, "user_removed");
  };

  const unassignedUsers = users.filter(u => !assigneeData.some(a => a.id === u.id));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assigneeData.map((assignee) => (
        <Badge key={assignee.id} variant="secondary" className="flex items-center gap-1.5 px-2 py-1 bg-muted">
          <Briefcase className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {assignee.data ? `${assignee.data.first_name || ''} ${assignee.data.last_name || ''}`.trim() || assignee.data.email : (loading ? 'Loading...' : 'Unknown User')}
          </span>
          <button 
            onClick={() => handleRemove(assignee.ref, assignee.id)}
            className="hover:bg-background rounded-full p-0.5"
          >
            <X className="w-3 h-3 text-muted-foreground hover:text-red-500" />
          </button>
        </Badge>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-full border-dashed">
            <UserPlus className="w-3 h-3 mr-1" />
            Assign User
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {unassignedUsers.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">No more users to assign</div>
          ) : (
            unassignedUsers.map(u => (
              <DropdownMenuItem key={u.id} className="cursor-pointer" onClick={() => handleAssign(u.id)}>
                {u.first_name ? `${u.first_name} ${u.last_name}` : u.email || u.id}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
