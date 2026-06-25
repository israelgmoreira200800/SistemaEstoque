"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { acceptInviteAction, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = {};

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initialState);

  return (
    <form action={action} className="login-form" noValidate>
      <input type="hidden" name="token" value={token} />

      <div className="field-group">
        <label htmlFor="password">Criar senha</label>
        <div className="field-control">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            placeholder="Minimo de 12 caracteres"
            aria-describedby={state.fields?.password ? "password-error" : undefined}
            aria-invalid={Boolean(state.fields?.password)}
            required
            disabled={state.completed}
          />
        </div>
        {state.fields?.password && <p className="field-error" id="password-error">{state.fields.password[0]}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="confirmPassword">Confirmar senha</label>
        <div className="field-control">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            aria-describedby={state.fields?.confirmPassword ? "confirm-password-error" : undefined}
            aria-invalid={Boolean(state.fields?.confirmPassword)}
            required
            disabled={state.completed}
          />
        </div>
        {state.fields?.confirmPassword && (
          <p className="field-error" id="confirm-password-error">{state.fields.confirmPassword[0]}</p>
        )}
      </div>

      {state.error && <div className="form-alert" role="alert">{state.error}</div>}
      {state.message && <div className="form-alert form-success" role="status">{state.message}</div>}

      {state.completed ? (
        <Link className="primary-button" href="/login">Entrar no sistema</Link>
      ) : (
        <button className="primary-button" disabled={pending || !token} type="submit">
          <span>{pending ? "Ativando..." : "Ativar acesso"}</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      )}
    </form>
  );
}
