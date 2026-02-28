import { MainHeader } from "@/components/layout/mainHeader";
import { MainSidebar } from "@/components/layout/mainSidebar";
import { AuthProvider } from "@/lib/auth-context"
import AuthRequiredWrapper from "@/lib/auth-required-wrapper";

export default async function InternalLayout({ children, params }: {children: React.ReactNode, params: Promise<{ company:  string}>}) {
  const { company } = await params;

  return (
    <div>
      <AuthProvider>
        <AuthRequiredWrapper>
          <div className="flex h-screen w-screen print:h-auto print:w-auto print:block">
            <div className="print:hidden">
              <MainSidebar company={company} />
            </div>
            <div className="flex flex-col flex-1 print:block">
              <div className="print:hidden">
                <MainHeader company={company} />
              </div>

              <main className="flex-1 overflow-auto print:overflow-visible print:h-auto">
                {children}
              </main>
            </div>
          </div>
        </AuthRequiredWrapper>
      </AuthProvider>
    </div>
  );
}
