"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { platformLoginAction, type PlatformLoginActionState } from "./actions";

const initialState: PlatformLoginActionState = {};

export function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLoginAction, initialState);

  return (
    <form action={action} className="login-form" noValidate>
      <div className="field-group">
        <label htmlFor="platform-email">E-mail</label>
        <div className="field-control">
          <Mail aria-hidden="true" size={18} />
          <input
            id="platform-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="operador@vertice.local"
            aria-describedby={state.fields?.email ? "platform-email-error" : undefined}
            aria-invalid={Boolean(state.fields?.email)}
            required
          />
        </div>
        {state.fields?.email && (
          <p className="field-error" id="platform-email-error">
            {state.fields.email[0]}
          </p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="platform-password">Senha</label>
        <div className="field-control">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            id="platform-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-describedby={state.fields?.password ? "platform-password-error" : undefined}
            aria-invalid={Boolean(state.fields?.password)}
            required
          />
        </div>
        {state.fields?.password && (
          <p className="field-error" id="platform-password-error">
            {state.fields.password[0]}
          </p>
        )}
      </div>

      {state.message && (
        <div className="form-alert" role="alert">
          {state.message}
        </div>
      )}

      <button className="primary-button" disabled={pending} type="submit">
        <span>{pending ? "Entrando..." : "Entrar na plataforma"}</span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </form>
  );
}
