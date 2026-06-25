"use client";

import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { requestPasswordResetAction, type RequestPasswordResetState } from "./actions";

const initialState: RequestPasswordResetState = {};

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={action} className="login-form" noValidate>
      <div className="field-group">
        <label htmlFor="email">E-mail</label>
        <div className="field-control">
          <Mail aria-hidden="true" size={18} />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            aria-describedby={state.fields?.email ? "email-error" : undefined}
            aria-invalid={Boolean(state.fields?.email)}
            required
          />
        </div>
        {state.fields?.email && (
          <p className="field-error" id="email-error">
            {state.fields.email[0]}
          </p>
        )}
      </div>

      {state.error && <div className="form-alert" role="alert">{state.error}</div>}
      {state.message && <div className="form-alert form-success" role="status">{state.message}</div>}

      <button className="primary-button" disabled={pending} type="submit">
        <span>{pending ? "Enviando..." : "Enviar instrucoes"}</span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </form>
  );
}
