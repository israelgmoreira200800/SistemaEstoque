"use client";

import { useActionState } from "react";
import {
  assignRoleAction,
  assignSectorAction,
  createRoleAction,
  createSectorAction,
  createUserAction,
  duplicateRoleAction,
  inactivateRoleAction,
  setUserPermissionOverrideAction,
  toggleUserStatusAction,
  updateRoleAction,
  type AccessActionState,
} from "./actions";

const initialState: AccessActionState = {};

type PermissionGroup = {
  module: string;
  label: string;
  permissions: { key: string; name: string }[];
};

type Role = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  isSystem: boolean;
  permissionKeys: string[];
};

type User = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "BLOCKED";
  roleIds: string[];
  sectorIds: string[];
  overrides: { permissionKey: string; effect: "GRANT" | "DENY" }[];
};

type Sector = { id: string; name: string; status: "ACTIVE" | "INACTIVE" };

function Feedback({ state }: { state: AccessActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function CreateUserForm({ roles, sectors }: { roles: Role[]; sectors: Sector[] }) {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  return (
    <form action={action} className="item-form">
      <div className="form-row four-columns">
        <label>Nome<input name="name" required /></label>
        <label>E-mail<input name="email" type="email" required /></label>
        <label>Senha inicial<input name="password" type="password" minLength={12} required /></label>
        <label>Cargo inicial<select name="roleId" defaultValue=""><option value="">Sem cargo</option>{roles.filter((role) => role.status === "ACTIVE").map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label>
      </div>
      <label>Setor inicial<select name="sectorId" defaultValue=""><option value="">Sem setor</option>{sectors.filter((sector) => sector.status === "ACTIVE").map((sector) => <option value={sector.id} key={sector.id}>{sector.name}</option>)}</select></label>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending}>{pending ? "Criando…" : "Criar usuário"}</button>
    </form>
  );
}

export function CreateRoleForm({ groups }: { groups: PermissionGroup[] }) {
  const [state, action, pending] = useActionState(createRoleAction, initialState);
  return (
    <form action={action} className="item-form">
      <div className="form-row">
        <label>Nome do cargo<input name="name" required /></label>
        <label>Descrição<input name="description" /></label>
      </div>
      <PermissionChecklist groups={groups} selected={[]} />
      <Feedback state={state} />
      <button className="secondary-button form-submit" disabled={pending}>{pending ? "Criando…" : "Criar cargo"}</button>
    </form>
  );
}

export function RoleCard({ role, groups, canManage }: { role: Role; groups: PermissionGroup[]; canManage: boolean }) {
  const [updateState, updateAction, updating] = useActionState(updateRoleAction, initialState);
  const [duplicateState, duplicateAction, duplicating] = useActionState(duplicateRoleAction, initialState);
  const [inactiveState, inactiveAction, inactivating] = useActionState(inactivateRoleAction, initialState);

  return (
    <details className="role-card">
      <summary>
        <span><strong>{role.name}</strong><small>{role.description ?? "Sem descrição"} · {role.permissionKeys.length} permissões</small></span>
        <span className={`status-badge ${role.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{role.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
      </summary>
      {!canManage && <PermissionChecklist groups={groups} selected={role.permissionKeys} disabled />}
      {canManage && (
      <>
      <form action={updateAction} className="item-form">
        <input type="hidden" name="id" value={role.id} />
        <div className="form-row">
          <label>Nome<input name="name" defaultValue={role.name} required /></label>
          <label>Descrição<input name="description" defaultValue={role.description ?? ""} /></label>
        </div>
        <PermissionChecklist groups={groups} selected={role.permissionKeys} />
        <Feedback state={updateState} />
        <button className="secondary-button form-submit" disabled={updating || role.status === "INACTIVE"}>{updating ? "Salvando…" : "Salvar cargo"}</button>
      </form>
      <div className="form-row role-actions-row">
        <form action={duplicateAction}>
          <input type="hidden" name="id" value={role.id} />
          <button className="text-button" disabled={duplicating}>{duplicating ? "Duplicando…" : "Duplicar cargo"}</button>
          <Feedback state={duplicateState} />
        </form>
        <form action={inactiveAction}>
          <input type="hidden" name="id" value={role.id} />
          <button className="text-button danger-text" disabled={inactivating || role.isSystem || role.status === "INACTIVE"}>{inactivating ? "Inativando…" : "Inativar cargo"}</button>
          <Feedback state={inactiveState} />
        </form>
      </div>
      </>
      )}
    </details>
  );
}

function PermissionChecklist({ groups, selected, disabled = false }: { groups: PermissionGroup[]; selected: string[]; disabled?: boolean }) {
  const selectedSet = new Set(selected);
  return (
    <div className="permission-grid">
      {groups.map((group) => (
        <fieldset key={group.module}>
          <legend>{group.label}</legend>
          {group.permissions.map((permission) => (
            <label className="check-field" key={permission.key}>
              <input name="permissionKey" value={permission.key} type="checkbox" defaultChecked={selectedSet.has(permission.key)} disabled={disabled} />
              {permission.name}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export function UserAccessCard({ user, roles, sectors, permissionKeys }: { user: User; roles: Role[]; sectors: Sector[]; permissionKeys: { key: string; name: string }[] }) {
  const [statusState, statusAction, toggling] = useActionState(toggleUserStatusAction, initialState);
  const [roleState, roleAction, assigningRole] = useActionState(assignRoleAction, initialState);
  const [sectorState, sectorAction, assigningSector] = useActionState(assignSectorAction, initialState);
  const [overrideState, overrideAction, overriding] = useActionState(setUserPermissionOverrideAction, initialState);

  return (
    <details className="role-card">
      <summary>
        <span><strong>{user.name}</strong><small>{user.email}</small></span>
        <span className={`status-badge ${user.status === "BLOCKED" ? "status-inactive" : ""}`}><span />{user.status === "ACTIVE" ? "Ativo" : "Bloqueado"}</span>
      </summary>
      <div className="access-grid">
        <form action={roleAction} className="compact-form">
          <input type="hidden" name="userId" value={user.id} />
          <label>Cargo<select name="roleId" defaultValue="" required><option value="" disabled>Selecione</option>{roles.filter((role) => role.status === "ACTIVE").map((role) => <option value={role.id} key={role.id}>{role.name}{user.roleIds.includes(role.id) ? " (já possui)" : ""}</option>)}</select></label>
          <div className="form-row">
            <button className="secondary-button" name="operation" value="add" disabled={assigningRole}>Adicionar</button>
            <button className="secondary-button" name="operation" value="remove" disabled={assigningRole}>Remover</button>
          </div>
          <Feedback state={roleState} />
        </form>

        <form action={sectorAction} className="compact-form">
          <input type="hidden" name="userId" value={user.id} />
          <label>Setor<select name="sectorId" defaultValue="" required><option value="" disabled>Selecione</option>{sectors.filter((sector) => sector.status === "ACTIVE").map((sector) => <option value={sector.id} key={sector.id}>{sector.name}{user.sectorIds.includes(sector.id) ? " (já possui)" : ""}</option>)}</select></label>
          <div className="form-row">
            <button className="secondary-button" name="operation" value="add" disabled={assigningSector}>Adicionar</button>
            <button className="secondary-button" name="operation" value="remove" disabled={assigningSector}>Remover</button>
          </div>
          <Feedback state={sectorState} />
        </form>

        <form action={overrideAction} className="compact-form">
          <input type="hidden" name="userId" value={user.id} />
          <label>Permissão individual<select name="permissionKey" defaultValue="" required><option value="" disabled>Selecione</option>{permissionKeys.map((permission) => <option value={permission.key} key={permission.key}>{permission.name}</option>)}</select></label>
          <div className="form-row three-small-buttons">
            <button className="secondary-button" name="effect" value="GRANT" disabled={overriding}>Conceder</button>
            <button className="secondary-button" name="effect" value="DENY" disabled={overriding}>Negar</button>
            <button className="secondary-button" name="effect" value="REMOVE" disabled={overriding}>Limpar</button>
          </div>
          <Feedback state={overrideState} />
        </form>
      </div>
      <p className="table-note">Overrides atuais: {user.overrides.length === 0 ? "nenhum" : user.overrides.map((override) => `${override.effect === "GRANT" ? "Concede" : "Nega"} ${override.permissionKey}`).join(", ")}</p>
      <form action={statusAction} className="danger-zone">
        <input type="hidden" name="id" value={user.id} />
        <div><strong>{user.status === "ACTIVE" ? "Bloquear usuário" : "Desbloquear usuário"}</strong><p>Usuários bloqueados não conseguem acessar o sistema.</p></div>
        <button className="secondary-button" disabled={toggling}>{toggling ? "Aguarde…" : user.status === "ACTIVE" ? "Bloquear" : "Desbloquear"}</button>
        <Feedback state={statusState} />
      </form>
    </details>
  );
}

export function CreateSectorForm() {
  const [state, action, pending] = useActionState(createSectorAction, initialState);
  return (
    <form action={action} className="compact-form">
      <div className="form-row">
        <label>Setor<input name="name" required /></label>
        <label>Descrição<input name="description" /></label>
      </div>
      <Feedback state={state} />
      <button className="secondary-button" disabled={pending}>{pending ? "Criando…" : "Criar setor"}</button>
    </form>
  );
}
