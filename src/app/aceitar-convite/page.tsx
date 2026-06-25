import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, UserPlus } from "lucide-react";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Aceite de convite">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark"><Image src="/brand/vertice-app-icon.png" alt="" width={40} height={40} priority /></span>
          <span>Vertice</span>
        </div>

        <div className="story-content">
          <div className="eyebrow eyebrow-light"><UserPlus size={14} /> Convite</div>
          <h1>Ative seu acesso ao painel operacional.</h1>
          <p>Defina sua senha para aceitar o convite enviado pelo administrador da empresa.</p>
        </div>

        <p className="story-footnote">Convites expiram e links antigos sao invalidados quando um novo e enviado.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <Image className="brand-horizontal-image" src="/brand/vertice-logo-horizontal.png" alt="Vertice" width={360} height={119} priority />
          </div>
          <div className="login-heading">
            <span className="security-chip"><ShieldCheck size={15} /> Ativacao segura</span>
            <h2>Aceitar convite</h2>
            <p>{token ? "Crie sua senha para ativar a conta." : "Abra esta tela pelo link recebido no convite."}</p>
          </div>
          <AcceptInviteForm token={token} />
          <p className="login-support"><Link className="muted-link" href="/login">Ja tenho acesso</Link></p>
        </div>
      </section>
    </main>
  );
}
