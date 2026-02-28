import { MainHeader } from "@/components/layout/mainHeader";
import { MainSidebar } from "@/components/layout/mainSidebar";
import { SidebarInset } from "@/components/ui/sidebar";

export default async function InternalLayout({ children, params }: {children: React.ReactNode, params: Promise<{ company:  string}>}) {
  const { company } = await params;

  return (
    <div>
      <div className="flex h-screen w-screen">
        <MainSidebar company={company} />

        <div className="flex flex-col flex-1">
          <MainHeader company={company} />

          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
