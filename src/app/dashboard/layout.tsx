import { AppSidebar } from "@/components/app-sidebar";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  return (
    <div className="app-shell">
      <AppSidebar session={session} />
      <div className="app-content">
        {children}
        <footer className="app-footer">V&eacute;rtice &copy; 2026 - Desenvolvido por Israel Gomes Moreira</footer>
      </div>
    </div>
  );
}

