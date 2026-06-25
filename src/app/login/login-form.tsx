"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

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

      <div className="field-group">
        <div className="label-row">
          <label htmlFor="password">Senha</label>
          <Link className="muted-link" href="/recuperar-senha">Recuperar senha</Link>
        </div>
        <div className="field-control">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-describedby={state.fields?.password ? "password-error" : undefined}
            aria-invalid={Boolean(state.fields?.password)}
            required
          />
        </div>
        {state.fields?.password && (
          <p className="field-error" id="password-error">
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
        <span>{pending ? "Entrando..." : "Entrar no sistema"}</span>
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </form>
  );
}
