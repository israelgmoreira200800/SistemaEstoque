import Link from "next/link";
import { ArrowUpRight, Building2, ClipboardList, LogOut, ShieldCheck, Users } from "lucide-react";
import { requirePlatformSession } from "@/lib/auth/platform-session";
import { prisma } from "@/lib/prisma";
import { platformLogoutAction } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function PlatformHomePage() {
  const session = await requirePlatformSession();
  const [
    companyCount,
    activeCompanies,
    trialCompanies,
    suspendedCompanies,
    operatorCount,
    planCount,
    latestCompanies,
    latestAudit,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "TRIAL" } }),
    prisma.company.count({ where: { status: "SUSPENDED" } }),
    prisma.platformUser.count({ where: { status: "ACTIVE" } }),
    prisma.plan.count({ where: { status: "ACTIVE" } }),
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { plan: true, _count: { select: { users: true, items: true } } },
    }),
    prisma.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        platformUser: { select: { name: true } },
        company: { select: { name: true } },
      },
    }),
  ]);

  return (
    <main className="page-body platform-page">
      <section className="settings-hero content-card">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={14} /> Plataforma Vertice
          </span>
          <h2>Console interno</h2>
          <p>
            Sessao ativa para {session.user.name} ({session.user.role}). Gerencie empresas
            clientes, acompanhe uso basico e controle suspensoes.
          </p>
        </div>
        <form action={platformLogoutAction}>
          <button className="settings-health" type="submit">
            <LogOut size={15} /> Sair
          </button>
        </form>
      </section>

      <section className="metric-grid" aria-label="Resumo da plataforma">
        <article className="metric-card">
          <span className="metric-icon metric-blue">
            <Building2 size={20} />
          </span>
          <div>
            <small>Empresas</small>
            <strong>{companyCount}</strong>
            <p>{activeCompanies} ativas, {trialCompanies} em trial</p>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-amber">
            <Building2 size={20} />
          </span>
          <div>
            <small>Suspensas</small>
            <strong>{suspendedCompanies}</strong>
            <p>bloqueadas no login empresarial</p>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-green">
            <Users size={20} />
          </span>
          <div>
            <small>Operadores ativos</small>
            <strong>{operatorCount}</strong>
            <p>contas da plataforma</p>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-violet">
            <ClipboardList size={20} />
          </span>
          <div>
            <small>Planos ativos</small>
            <strong>{planCount}</strong>
            <p>controle manual</p>
          </div>
        </article>
      </section>

      <section className="quick-actions" aria-label="Acoes da plataforma">
        <Link className="quick-action-card" href="/platform/companies">
          <Building2 size={20} />
          <span>Empresas</span>
        </Link>
        <Link className="quick-action-card" href="/platform/companies?status=TRIAL">
          <ClipboardList size={20} />
          <span>Trials</span>
        </Link>
        <Link className="quick-action-card" href="/platform/companies?status=SUSPENDED">
          <ShieldCheck size={20} />
          <span>Suspensas</span>
        </Link>
      </section>

      <section className="dashboard-grid">
        <article className="content-card table-card catalog-table">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Empresas recentes</span>
              <h3>Novos tenants</h3>
            </div>
            <Link href="/platform/companies">
              Ver tudo <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="data-table platform-home-table">
            <div className="table-row table-head">
              <span>Empresa</span>
              <span>Status</span>
              <span>Plano</span>
              <span>Uso</span>
            </div>
            {latestCompanies.map((company) => (
              <div className="table-row" key={company.id}>
                <span>
                  <strong>{company.name}</strong>
                  <small>{company.slug}</small>
                </span>
                <span>{company.status}</span>
                <span>{company.plan?.name ?? "-"}</span>
                <span>{company._count.users} usuarios, {company._count.items} itens</span>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card table-card catalog-table">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Auditoria</span>
              <h3>Eventos da plataforma</h3>
            </div>
          </div>
          <div className="data-table platform-audit-table">
            <div className="table-row table-head">
              <span>Data</span>
              <span>Acao</span>
              <span>Contexto</span>
            </div>
            {latestAudit.map((event) => (
              <div className="table-row" key={event.id}>
                <span>{formatDate(event.createdAt)}</span>
                <span>
                  <code>{event.action}</code>
                </span>
                <span>{event.company?.name ?? event.platformUser?.name ?? "Sistema"}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
