import Timeline from "@/components/Timeline";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ company: string; id: string }>;
}) {
  const { company, id } = await params;

  // Fetch the project to get its timeline reference
  const projectRef = doc(db, "projects", id);
  const projectSnap = await getDoc(projectRef);
  const projectData = projectSnap.data();

  // Assuming the project has a reference to the timeline
  const timelineId = projectData?.timeline?.id;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Main project content will go here */}
        <h1 className="text-2xl font-bold mb-4">Project {id}</h1>
      </div>

      <aside className="w-[550px] flex-shrink-0 bg-background h-full overflow-hidden">
        {timelineId ? (
          <Timeline 
            companyId={company} 
            timelineId={timelineId} 
            generatedById={id} 
            generatedByType="projects" 
          />
        ) : (
          <div className="p-4 text-sm text-muted-foreground border-l h-full">No timeline attached to this project.</div>
        )}
      </aside>
    </div>
  );
}