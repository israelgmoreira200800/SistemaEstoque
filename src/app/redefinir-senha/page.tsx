import Image from "next/image";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Redefinicao de senha">
        <div className="brand-lockup brand-lockup-light">
          <span className="brand-mark"><Image src="/brand/vertice-app-icon.png" alt="" width={40} height={40} priority /></span>
          <span>Vertice</span>
        </div>

        <div className="story-content">
          <div className="eyebrow eyebrow-light"><KeyRound size={14} /> Nova senha</div>
          <h1>Defina uma nova senha para continuar.</h1>
          <p>Use uma senha forte. Ao concluir, suas sessoes anteriores serao encerradas.</p>
        </div>

        <p className="story-footnote">O link so pode ser usado uma vez.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand-lockup">
            <Image className="brand-horizontal-image" src="/brand/vertice-logo-horizontal.png" alt="Vertice" width={360} height={119} priority />
          </div>
          <div className="login-heading">
            <span className="security-chip"><ShieldCheck size={15} /> Link temporario</span>
            <h2>Redefinir senha</h2>
            <p>{token ? "Informe e confirme sua nova senha." : "Abra esta tela pelo link enviado ao seu e-mail."}</p>
          </div>
          <ResetPasswordForm token={token} />
          <p className="login-support"><Link className="muted-link" href="/recuperar-senha">Solicitar novo link</Link></p>
        </div>
      </section>
    </main>
  );
}
