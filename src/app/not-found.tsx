import Link from "next/link";
import { Boxes } from "lucide-react";

export default function NotFound() {
  return <main className="simple-state"><Boxes size={38} /><span className="eyebrow">Erro 404</span><h1>Essa página não está no estoque.</h1><p>O endereço pode ter mudado ou ainda não foi implementado.</p><Link className="primary-button" href="/dashboard">Voltar ao painel</Link></main>;
}

