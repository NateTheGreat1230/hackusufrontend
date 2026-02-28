import { MainSidebar } from "@/components/layout/mainSidebar";

export default async function InternalLayout({ children, params }: {children: React.ReactNode, params: Promise<{ company:  string}>}) {

  const { company } = await params;

  return (
    <div>
      <MainSidebar company={company} />
      {children}
    </div>
  );
}