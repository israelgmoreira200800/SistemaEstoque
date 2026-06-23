import { Boxes, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/dashboard");

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Apresentação do produto">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark"><Boxes aria-hidden="true" size={24} /></span>
          <span>Vértice</span>
        </div>

        <div className="story-content">
          <div className="eyebrow eyebrow-light"><Sparkles size={14} /> Operação em um só lugar</div>
          <h1>Estoque claro.<br />Produção no ritmo.</h1>
          <p>
            Do recebimento à expedição, acompanhe cada movimento com segurança,
            rastreabilidade e decisões melhores.
          </p>

          <ul className="story-points">
            <li><CheckCircle2 size={18} /> Saldos físico, reservado e disponível</li>
            <li><CheckCircle2 size={18} /> Produção e consumo totalmente rastreáveis</li>
            <li><CheckCircle2 size={18} /> Acesso por empresa, cargo e permissão</li>
          </ul>
        </div>

        <p className="story-footnote">Gestão que acompanha a realidade da sua operação.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <span className="brand-mark"><Boxes aria-hidden="true" size={22} /></span>
            <span>Vértice</span>
          </div>
          <div className="login-heading">
            <span className="security-chip"><ShieldCheck size={15} /> Acesso seguro</span>
            <h2>Boas-vindas</h2>
            <p>Use suas credenciais para acessar sua empresa.</p>
          </div>
          <LoginForm />
          <p className="login-support">Problemas para entrar? Fale com o administrador da sua empresa.</p>
        </div>
      </section>
    </main>
  );
}

