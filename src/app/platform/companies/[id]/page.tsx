import Link from "next/link";
import { ArrowLeft, Building2, ClipboardList, Package, ShieldAlert, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePlatformSession } from "@/lib/auth/platform-session";
import { prisma } from "@/lib/prisma";
import { CompanyStatusForm } from "../company-forms";

const statusLabels: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function PlatformCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformSession();
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      plan: true,
      _count: {
        select: {
          users: true,
          items: true,
          stockMovements: true,
          customerOrders: true,
          productions: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { plan: true },
      },
      usageLimits: { orderBy: { key: "asc" } },
      platformAuditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { platformUser: { select: { name: true, email: true } } },
      },
    },
  });
  if (!company) notFound();

  const activeSubscription = company.subscriptions[0];

  return (
    <main className="page-body">
      <Link href="/platform/companies" className="back-link">
        <ArrowLeft size={15} /> Voltar para empresas
      </Link>

      <section className="settings-hero content-card">
        <div>
          <span className="eyebrow">
            <Building2 size={14} /> Tenant
          </span>
          <h2>{company.name}</h2>
          <p>
            {company.slug} | {company.email ?? "sem e-mail"} | {company.document ?? "sem documento"}
          </p>
        </div>
        <span className={`settings-health ${company.status === "SUSPENDED" || company.status === "CANCELLED" ? "status-inactive" : ""}`}>
          {statusLabels[company.status]}
        </span>
      </section>

      <section className="metric-grid" aria-label="Uso da empresa">
        <article className="metric-card">
          <span className="metric-icon metric-blue">
            <Users size={20} />
          </span>
          <div>
            <small>Usuarios</small>
            <strong>{company._count.users}</strong>
            <p>contas empresariais</p>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-green">
            <Package size={20} />
          </span>
          <div>
            <small>Itens</small>
            <strong>{company._count.items}</strong>
            <p>cadastrados no tenant</p>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-violet">
            <ClipboardList size={20} />
          </span>
          <div>
            <small>Pedidos</small>
            <strong>{company._count.customerOrders}</strong>
            <p>registrados</p>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-amber">
            <ShieldAlert size={20} />
          </span>
          <div>
            <small>Movimentos</small>
            <strong>{company._count.stockMovements}</strong>
            <p>historico de estoque</p>
          </div>
        </article>
      </section>

      <section className="settings-panel-grid item-create-card">
        <article className="content-card settings-panel">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Plano</span>
              <h3>{activeSubscription?.plan.name ?? company.plan?.name ?? "Sem plano"}</h3>
            </div>
          </div>
          <div className="settings-kpi-grid">
            <div className="settings-kpi">
              <span>Status</span>
              <strong>{activeSubscription?.status ?? "-"}</strong>
            </div>
            <div className="settings-kpi">
              <span>Trial ate</span>
              <strong>{formatDate(company.trialEndsAt)}</strong>
            </div>
            <div className="settings-kpi">
              <span>Criada em</span>
              <strong>{formatDate(company.createdAt)}</strong>
            </div>
            <div className="settings-kpi">
              <span>Atualizada em</span>
              <strong>{formatDate(company.updatedAt)}</strong>
            </div>
          </div>
          <div className="tag-list">
            {company.usageLimits.map((limit) => (
              <span className="status-badge" key={limit.id}>
                <span />
                {limit.key}: {limit.usedValue}
                {limit.limitValue ? `/${limit.limitValue}` : ""} {limit.unit ?? ""}
              </span>
            ))}
            {company.usageLimits.length === 0 && <p className="empty-state">Nenhum limite configurado.</p>}
          </div>
        </article>

        <article className="content-card settings-panel">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Ciclo de vida</span>
              <h3>Controle de acesso</h3>
            </div>
          </div>
          <div className="platform-action-stack">
            {company.status === "TRIAL" && (
              <CompanyStatusForm companyId={company.id} operation="activate" label="Ativar empresa" />
            )}
            {company.status === "SUSPENDED" && (
              <CompanyStatusForm companyId={company.id} operation="reactivate" label="Reativar empresa" />
            )}
            {(company.status === "TRIAL" || company.status === "ACTIVE") && (
              <CompanyStatusForm companyId={company.id} operation="suspend" label="Suspender empresa" requireReason />
            )}
            {company.status !== "CANCELLED" && (
              <CompanyStatusForm companyId={company.id} operation="cancel" label="Encerrar empresa" requireReason />
            )}
            {company.status === "CANCELLED" && <p className="table-note">Empresa encerrada. Recriacao ou reversao exige fluxo dedicado.</p>}
          </div>
        </article>
      </section>

      <section className="content-card table-card catalog-table item-create-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Auditoria da plataforma</span>
            <h3>Ultimos eventos</h3>
          </div>
        </div>
        <div className="data-table platform-audit-table">
          <div className="table-row table-head">
            <span>Data</span>
            <span>Acao</span>
            <span>Operador</span>
            <span>Motivo</span>
          </div>
          {company.platformAuditLogs.map((event) => (
            <div className="table-row" key={event.id}>
              <span>{formatDate(event.createdAt)}</span>
              <span>
                <code>{event.action}</code>
              </span>
              <span>{event.platformUser?.name ?? "Sistema"}</span>
              <span>{event.reason ?? "-"}</span>
            </div>
          ))}
          {company.platformAuditLogs.length === 0 && <p className="empty-state">Nenhuma acao da plataforma registrada.</p>}
        </div>
      </section>
    </main>
  );
}
