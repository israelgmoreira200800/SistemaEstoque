import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PERMISSIONS, permissionModuleLabel } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CreateRoleForm, CreateSectorForm, CreateUserForm, RoleCard, UserAccessCard } from "./access-forms";

export default async function UsersPage() {
  const session = await requirePermission("user.view");
  const canManageRoles = session.permissions.has("role.view");
  const canManageUsers = session.permissions.has("user.update");

  const [users, roles, sectors] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: session.company.id },
      include: {
        roles: { include: { role: true } },
        sectors: { include: { sector: true } },
        permissionOverrides: { include: { permission: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.role.findMany({
      where: { companyId: session.company.id },
      include: { permissions: { include: { permission: true } } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.sector.findMany({
      where: { companyId: session.company.id },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
  ]);

  const groups = Object.values(
    PERMISSIONS.reduce<Record<string, { module: string; label: string; permissions: { key: string; name: string }[] }>>(
      (acc, permission) => {
        acc[permission.module] ??= { module: permission.module, label: permissionModuleLabel(permission.module), permissions: [] };
        acc[permission.module].permissions.push({ key: permission.key, name: permission.name });
        return acc;
      },
      {},
    ),
  );
  const roleModels = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    status: role.status,
    isSystem: role.isSystem,
    permissionKeys: role.permissions.map(({ permission }) => permission.key),
  }));
  const sectorModels = sectors.map((sector) => ({ id: sector.id, name: sector.name, status: sector.status }));
  const permissionOptions = PERMISSIONS.map((permission) => ({ key: permission.key, name: permission.name }));
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const blockedUsers = users.length - activeUsers;
  const activeRoles = roles.filter((role) => role.status === "ACTIVE").length;

  return (
    <>
      <PageHeader title="Usuários e permissões" subtitle="Controle fino de acessos, cargos e setores da operação." />
      <main className="page-body access-page">
        <section className="access-overview" aria-label="Resumo de acessos">
          <article><span>Usuários ativos</span><strong>{activeUsers}</strong><small>{blockedUsers} bloqueado{blockedUsers === 1 ? "" : "s"}</small></article>
          <article><span>Cargos ativos</span><strong>{activeRoles}</strong><small>{roles.length} cargo{roles.length === 1 ? "" : "s"} cadastrados</small></article>
          <article><span>Setores</span><strong>{sectors.length}</strong><small>vínculos operacionais</small></article>
        </section>

        {session.permissions.has("user.create") && (
          <section className="content-card catalog-card access-create-card">
            <div className="card-heading"><div><span className="eyebrow"><Users size={14} /> Novo usuário</span><h3>Criar acesso</h3></div></div>
            <CreateUserForm roles={roleModels} sectors={sectorModels} />
          </section>
        )}

        <div className="access-layout">
          <section className="content-card catalog-card access-main-card">
            <div className="card-heading"><div><span className="eyebrow"><Users size={14} /> Usuários</span><h3>{users.length} usuário{users.length === 1 ? "" : "s"}</h3></div></div>
            <div className="access-list">
              {users.map((user) => (
                <UserAccessCard
                  key={user.id}
                  user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    status: user.status,
                    roleIds: user.roles.map(({ roleId }) => roleId),
                    sectorIds: user.sectors.map(({ sectorId }) => sectorId),
                    overrides: user.permissionOverrides.map((override) => ({ permissionKey: override.permission.key, effect: override.effect })),
                  }}
                  roles={roleModels}
                  sectors={sectorModels}
                  permissionKeys={permissionOptions}
                />
              ))}
            </div>
            {!canManageUsers && <p className="table-note"><KeyRound size={15} /> Você pode visualizar usuários, mas não alterar acessos.</p>}
          </section>

          <aside className="access-side-stack">
            {session.permissions.has("user.update") && (
              <section className="content-card catalog-card access-side-card">
                <div className="card-heading"><div><span className="eyebrow">Setores operacionais</span><h3>{sectors.length} setor{sectors.length === 1 ? "" : "es"}</h3></div></div>
                <CreateSectorForm />
                <div className="tag-list">{sectors.map((sector) => <span className="status-badge" key={sector.id}><span />{sector.name}</span>)}</div>
              </section>
            )}
          </aside>
        </div>

        {canManageRoles && (
          <section className="content-card catalog-card access-main-card">
            <div className="card-heading"><div><span className="eyebrow"><ShieldCheck size={14} /> Cargos e permissões</span><h3>{roles.length} cargo{roles.length === 1 ? "" : "s"}</h3></div></div>
            {session.permissions.has("role.create") && session.permissions.has("permission.manage") && <CreateRoleForm groups={groups} />}
            <div className="access-list role-list">
              {roleModels.map((role) => <RoleCard key={role.id} role={role} groups={groups} canManage={session.permissions.has("permission.manage")} />)}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
