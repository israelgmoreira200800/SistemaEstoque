import Image from "next/image";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/dashboard");

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Apresentação do produto">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark"><Image src="/brand/vertice-app-icon.png" alt="" width={40} height={40} priority /></span>
          <span>Vertice</span>
        </div>

        <div className="story-content">
          <div className="eyebrow eyebrow-light"><Sparkles size={14} /> Torre de controle operacional</div>
          <h1>Controle preciso para estoque, pedidos e produção.</h1>
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

        <p className="story-footnote">Rastreabilidade, permissões e saldo real sem planilhas paralelas.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <Image className="brand-horizontal-image" src="/brand/vertice-logo-horizontal.png" alt="Vertice" width={360} height={119} priority />
          </div>
          <div className="login-heading">
            <span className="security-chip"><ShieldCheck size={15} /> Acesso seguro</span>
            <h2>Entrar no painel</h2>
            <p>Acesse a operação com sua sessão protegida.</p>
          </div>
          <LoginForm />
          <p className="login-support">Problemas para entrar? Fale com o administrador da sua empresa.</p>
        </div>
      </section>
    </main>
  );
}

