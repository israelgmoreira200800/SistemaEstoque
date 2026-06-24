"use client";

import { useActionState } from "react";
import {
  changePlatformCompanyStatusAction,
  createPlatformCompanyAction,
  type PlatformCompanyActionState,
} from "@/app/platform/actions";

const initialState: PlatformCompanyActionState = {};

function Feedback({ state }: { state: PlatformCompanyActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function CreateCompanyForm({
  plans,
}: {
  plans: { id: string; name: string; trialDays: number | null }[];
}) {
  const [state, action, pending] = useActionState(createPlatformCompanyAction, initialState);
  const hasPlans = plans.length > 0;

  return (
    <form action={action} className="item-form">
      <h4>Empresa</h4>
      <div className="form-row three-columns">
        <label>
          Nome
          <input name="name" required placeholder="Empresa cliente" />
        </label>
        <label>
          Slug
          <input name="slug" placeholder="empresa-cliente" />
        </label>
        <label>
          Status inicial
          <select name="status" defaultValue="TRIAL">
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Ativa</option>
            <option value="SUSPENDED">Suspensa</option>
          </select>
        </label>
      </div>

      <div className="form-row three-columns">
        <label>
          Nome legal
          <input name="legalName" />
        </label>
        <label>
          Nome fantasia
          <input name="tradeName" />
        </label>
        <label>
          Documento
          <input name="document" />
        </label>
      </div>

      <div className="form-row three-columns">
        <label>
          E-mail
          <input name="email" type="email" />
        </label>
        <label>
          Telefone
          <input name="phone" />
        </label>
        <label>
          Fuso horario
          <input name="timezone" defaultValue="America/Sao_Paulo" />
        </label>
      </div>

      <div className="form-row">
        <label>
          Plano
          <select name="planId" defaultValue="" required>
            <option value="" disabled>Selecione</option>
            {plans.map((plan) => (
              <option value={plan.id} key={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dias de trial
          <input name="trialDays" inputMode="numeric" placeholder="14" />
        </label>
      </div>

      <h4>Administrador inicial</h4>
      <div className="form-row three-columns">
        <label>
          Nome
          <input name="adminName" required placeholder="Administrador" />
        </label>
        <label>
          E-mail
          <input name="adminEmail" type="email" required placeholder="admin@empresa.com" />
        </label>
        <label>
          Senha inicial
          <input name="adminPassword" type="password" minLength={12} required autoComplete="new-password" />
        </label>
      </div>

      <Feedback state={state} />
      {!hasPlans && <p className="catalog-feedback catalog-error" role="alert">Crie ou ative um plano antes do onboarding.</p>}
      <button className="primary-button form-submit" disabled={pending || !hasPlans} type="submit">
        {pending ? "Criando..." : "Criar empresa e admin"}
      </button>
    </form>
  );
}

export function CompanyStatusForm({
  companyId,
  operation,
  label,
  requireReason = false,
}: {
  companyId: string;
  operation: "activate" | "suspend" | "reactivate" | "cancel";
  label: string;
  requireReason?: boolean;
}) {
  const [state, action, pending] = useActionState(changePlatformCompanyStatusAction, initialState);

  return (
    <form action={action} className="compact-form">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="operation" value={operation} />
      {requireReason && (
        <label>
          Motivo
          <input name="reason" maxLength={240} required />
        </label>
      )}
      <Feedback state={state} />
      <button
        className={operation === "cancel" ? "secondary-button danger-text" : "secondary-button"}
        disabled={pending}
        type="submit"
      >
        {pending ? "Atualizando..." : label}
      </button>
    </form>
  );
}
