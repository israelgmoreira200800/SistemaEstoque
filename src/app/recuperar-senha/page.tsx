import Image from "next/image";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { RequestResetForm } from "./request-reset-form";

export default function RequestPasswordResetPage() {
  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Recuperacao de senha">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark"><Image src="/brand/vertice-app-icon.png" alt="" width={40} height={40} priority /></span>
          <span>Vertice</span>
        </div>

        <div className="story-content">
          <div className="eyebrow eyebrow-light"><KeyRound size={14} /> Recuperacao de senha</div>
          <h1>Recupere o acesso sem expor sua conta.</h1>
          <p>Informe seu e-mail empresarial. Se a conta existir, enviaremos um link temporario para redefinir a senha.</p>
        </div>

        <p className="story-footnote">Links expiram e tokens sao armazenados apenas como hash.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <Image className="brand-horizontal-image" src="/brand/vertice-logo-horizontal.png" alt="Vertice" width={360} height={119} priority />
          </div>
          <div className="login-heading">
            <span className="security-chip"><ShieldCheck size={15} /> Acesso seguro</span>
            <h2>Recuperar senha</h2>
            <p>O link sera enviado para o e-mail cadastrado.</p>
          </div>
          <RequestResetForm />
          <p className="login-support"><Link className="muted-link" href="/login">Voltar para o login</Link></p>
        </div>
      </section>
    </main>
  );
}
