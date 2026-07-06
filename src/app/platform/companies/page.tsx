import Link from "next/link";
import { ArrowLeft, Building2, Search } from "lucide-react";
import { requirePlatformSession } from "@/lib/auth/platform-session";
import { prisma } from "@/lib/prisma";
import { CreateCompanyForm } from "./company-forms";

const statusLabels: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export default async function PlatformCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePlatformSession();
  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const status = query.status?.trim() ?? "";
  const allowedStatuses = ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"];

  const where = {
    ...(allowedStatuses.includes(status) ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { document: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [plans, companies] = await Promise.all([
    prisma.plan.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.company.findMany({
      where,
      include: {
        plan: true,
        _count: { select: { users: true, items: true, customerOrders: true } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <main className="page-body">
      <Link href="/platform" className="back-link">
        <ArrowLeft size={15} /> Voltar para plataforma
      </Link>

      <section className="settings-hero content-card">
        <div>
          <span className="eyebrow">
            <Building2 size={14} /> Empresas
          </span>
          <h2>Clientes e tenants</h2>
          <p>Crie tenants com administrador inicial, acompanhe uso basico e controle o ciclo de vida do acesso empresarial.</p>
        </div>
      </section>

      <section className="content-card catalog-card item-create-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Nova empresa</span>
            <h3>Onboarding transacional</h3>
          </div>
        </div>
        <CreateCompanyForm plans={plans.map(({ id, name, trialDays }) => ({ id, name, trialDays }))} />
      </section>

      <section className="content-card table-card catalog-table item-create-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Lista</span>
            <h3>{companies.length} empresa{companies.length === 1 ? "" : "s"}</h3>
          </div>
          <form className="catalog-search">
            <Search size={15} />
            <input name="q" defaultValue={q} placeholder="Nome, slug, documento ou e-mail" />
            <select name="status" defaultValue={status} aria-label="Status">
              <option value="">Todos</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Ativa</option>
              <option value="SUSPENDED">Suspensa</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
            <button className="text-button">Filtrar</button>
          </form>
        </div>

        <div className="data-table platform-company-table">
          <div className="table-row table-head">
            <span>Empresa</span>
            <span>Status</span>
            <span>Plano</span>
            <span>Uso</span>
            <span>Trial</span>
            <span />
          </div>
          {companies.map((company) => {
            const currentSubscription = company.subscriptions[0];
            return (
              <div className="table-row" key={company.id}>
                <span className="person-cell" data-label="Empresa">
                  <span className={`metric-icon ${company.status === "SUSPENDED" || company.status === "CANCELLED" ? "metric-muted" : "metric-green"}`}>
                    <Building2 size={17} />
                  </span>
                  <span>
                    <strong>{company.name}</strong>
                    <small>{company.slug}</small>
                  </span>
                </span>
                <span data-label="Status">
                  <span className={`status-badge ${company.status === "SUSPENDED" || company.status === "CANCELLED" ? "status-inactive" : ""}`}>
                    <span />
                    {statusLabels[company.status]}
                  </span>
                </span>
                <span data-label="Plano">{currentSubscription?.plan.name ?? company.plan?.name ?? "-"}</span>
                <span data-label="Uso">
                  {company._count.users} usuarios, {company._count.items} itens, {company._count.customerOrders} pedidos
                </span>
                <span data-label="Trial">{formatDate(company.trialEndsAt)}</span>
                <Link className="table-action" data-label="Ação" href={`/platform/companies/${company.id}`}>
                  Gerenciar
                </Link>
              </div>
            );
          })}
          {companies.length === 0 && <p className="empty-state">Nenhuma empresa encontrada.</p>}
        </div>
      </section>
    </main>
  );
}
