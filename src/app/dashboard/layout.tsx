import { AppSidebar } from "@/components/app-sidebar";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  return (
    <div className="app-shell">
      <AppSidebar session={session} />
      <div className="app-content">{children}</div>
    </div>
  );
}

