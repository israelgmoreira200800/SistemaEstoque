import Image from "next/image";
import { Building2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentPlatformSession } from "@/lib/auth/platform-session";
import { PlatformLoginForm } from "./platform-login-form";

export default async function PlatformLoginPage() {
  if (await getCurrentPlatformSession()) redirect("/platform");

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Acesso da plataforma">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark">
            <Image src="/brand/vertice-app-icon.png" alt="" width={40} height={40} priority />
          </span>
          <span>Vertice</span>
        </div>

        <div className="story-content">
          <div className="eyebrow eyebrow-light">
            <Building2 size={14} /> Plataforma
          </div>
          <h1>Operacao SaaS separada das empresas clientes.</h1>
          <p>
            Acesse o ambiente interno para administrar tenants, planos e eventos da
            plataforma sem usar cargos empresariais.
          </p>
        </div>

        <p className="story-footnote">Sessao propria, auditoria propria e acesso restrito.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <Image
              className="brand-horizontal-image"
              src="/brand/vertice-logo-horizontal.png"
              alt="Vertice"
              width={360}
              height={119}
              priority
            />
          </div>
          <div className="login-heading">
            <span className="security-chip">
              <ShieldCheck size={15} /> Acesso da plataforma
            </span>
            <h2>Entrar no console</h2>
            <p>Use sua conta de operador Vertice.</p>
          </div>
          <PlatformLoginForm />
        </div>
      </section>
    </main>
  );
}
