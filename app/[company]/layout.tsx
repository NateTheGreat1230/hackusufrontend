import { MainHeader } from "@/components/layout/mainHeader";
import { MainSidebar } from "@/components/layout/mainSidebar";
import { AuthProvider } from "@/lib/auth-context"
import AuthRequiredWrapper from "@/lib/auth-required-wrapper";
import { BreadcrumbProvider } from "@/lib/breadcrumb-context";

export default async function InternalLayout({ children, params }: {children: React.ReactNode, params: Promise<{ company:  string}>}) {
  const { company } = await params;

  return (
    <div>
      <AuthProvider>
        <AuthRequiredWrapper>
          <BreadcrumbProvider company={company}>
            <div className="flex h-screen w-screen print:h-auto print:w-auto print:block">
              <div className="print:hidden">
                <MainSidebar company={company} />
              </div>
              <div className="flex flex-col flex-1 print:block w-0 min-w-0">
                <div className="print:hidden">
                  <MainHeader company={company} />
                </div>

                <main className="flex-1 overflow-auto print:overflow-visible print:h-auto relative">
                  {children}
                </main>
              </div>
            </div>
          </BreadcrumbProvider>
        </AuthRequiredWrapper>
      </AuthProvider>
    </div>
  );
}
