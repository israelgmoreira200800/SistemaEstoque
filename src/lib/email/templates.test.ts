import { describe, expect, it } from "vitest";
import {
  buildCompanyCreatedEmail,
  buildOperationalNotificationEmail,
  buildPasswordResetEmail,
  buildStockAlertEmail,
  buildUserInviteEmail,
} from "./templates";

describe("email templates", () => {
  const expiresAt = new Date("2026-07-07T15:00:00.000Z");

  it("renderiza convite com assunto, empresa, botao e aviso de seguranca", () => {
    const email = buildUserInviteEmail({
      userName: "Ana",
      companyName: "Cliente Teste",
      invitedByName: "Carlos",
      inviteUrl: "https://app.exemplo.com/aceitar-convite?token=abc",
      expiresAt,
    });

    expect(email.subject).toBe("Convite para acessar o Vertice");
    expect(email.textBody).toContain("Cliente Teste");
    expect(email.textBody).toContain("Aceitar convite: https://app.exemplo.com/aceitar-convite?token=abc");
    expect(email.textBody).toContain("Se voce nao esperava este convite");
    expect(email.htmlBody).toContain("<!doctype html>");
    expect(email.htmlBody).toContain("Aceitar convite");
    expect(email.htmlBody).toContain("https://app.exemplo.com/aceitar-convite?token=abc");
    expect(email.htmlBody).not.toContain("SenhaSegura");
  });

  it("renderiza redefinicao de senha com link correto e sem expor senha", () => {
    const email = buildPasswordResetEmail({
      userName: "Ana",
      companyName: "Cliente Teste",
      resetUrl: "https://app.exemplo.com/redefinir-senha?token=abc",
      expiresAt,
    });

    expect(email.subject).toBe("Redefinicao de senha Vertice");
    expect(email.textBody).toContain("Redefinir senha: https://app.exemplo.com/redefinir-senha?token=abc");
    expect(email.textBody).toContain("Cliente Teste");
    expect(email.textBody).toContain("Se voce nao solicitou a redefinicao");
    expect(email.htmlBody).toContain("Redefinir senha");
    expect(email.htmlBody).not.toMatch(/password|senha atual:/i);
  });

  it("mantem templates futuros padronizados", () => {
    const created = buildCompanyCreatedEmail({
      companyName: "Cliente Teste",
      appUrl: "https://app.exemplo.com",
    });
    const stock = buildStockAlertEmail({
      companyName: "Cliente Teste",
      itemName: "Acucar",
      currentQuantity: "3",
      minimumQuantity: "8",
      occurredAt: expiresAt,
      stockUrl: "https://app.exemplo.com/dashboard/itens",
    });
    const order = buildOperationalNotificationEmail({
      type: "Pedido",
      title: "Pedido atualizado",
      identifier: "PED-1",
      status: "Separacao",
      responsibleName: "Ana",
      recordUrl: "https://app.exemplo.com/dashboard/pedidos",
    });

    expect(created.htmlBody).toContain("Acessar o sistema");
    expect(stock.textBody).toContain("Quantidade atual: 3");
    expect(stock.textBody).toContain("Estoque minimo: 8");
    expect(order.textBody).toContain("Identificacao: PED-1");
    expect(order.htmlBody).toContain("Acessar registro");
  });
});
