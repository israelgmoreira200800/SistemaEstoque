import { NextResponse } from "next/server";
import {
  buildCompanyCreatedEmail,
  buildCompanyReactivatedEmail,
  buildCompanySuspendedEmail,
  buildOperationalNotificationEmail,
  buildPasswordResetEmail,
  buildStockAlertEmail,
  buildUserInviteEmail,
} from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const sampleDate = new Date("2026-07-07T15:00:00.000Z");

function getPreview(template: string) {
  const appUrl = getServerEnv().APP_URL;

  switch (template) {
    case "invite-user":
      return buildUserInviteEmail({
        userName: "Ana Oliveira",
        companyName: "Empresa Demonstracao",
        invitedByName: "Administrador",
        inviteUrl: `${appUrl}/aceitar-convite?token=preview`,
        expiresAt: sampleDate,
      });
    case "company-created":
      return buildCompanyCreatedEmail({ companyName: "Empresa Demonstracao", appUrl });
    case "company-suspended":
      return buildCompanySuspendedEmail({
        companyName: "Empresa Demonstracao",
        reason: "Pendencia administrativa",
        supportEmail: "suporte@exemplo.com",
      });
    case "company-reactivated":
      return buildCompanyReactivatedEmail({ companyName: "Empresa Demonstracao", appUrl });
    case "stock-alert":
      return buildStockAlertEmail({
        companyName: "Empresa Demonstracao",
        itemName: "Farinha de trigo",
        currentQuantity: "4",
        minimumQuantity: "10",
        occurredAt: sampleDate,
        stockUrl: `${appUrl}/dashboard/itens`,
      });
    case "operational-notification":
      return buildOperationalNotificationEmail({
        type: "Pedido",
        title: "Pedido atualizado",
        identifier: "PED-1024",
        status: "Separacao",
        responsibleName: "Marcos Lima",
        recordUrl: `${appUrl}/dashboard/pedidos`,
        companyName: "Empresa Demonstracao",
      });
    case "reset-password":
    default:
      return buildPasswordResetEmail({
        userName: "Ana Oliveira",
        companyName: "Empresa Demonstracao",
        resetUrl: `${appUrl}/redefinir-senha?token=preview`,
        expiresAt: sampleDate,
      });
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Email preview is available only in development." }, { status: 404 });
  }

  const url = new URL(request.url);
  const template = url.searchParams.get("template") ?? "reset-password";
  const preview = getPreview(template);

  return new NextResponse(preview.htmlBody, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
