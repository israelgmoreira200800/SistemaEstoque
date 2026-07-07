export type EmailInfoItem = {
  label: string;
  value?: string | number | Date | null;
};

export type EmailAction = {
  label: string;
  url: string;
};

export type EmailContent = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

type LayoutInput = {
  subject: string;
  preheader: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  action?: EmailAction;
  infoItems?: EmailInfoItem[];
  securityNote?: string;
  footerNote?: string;
};

const BRAND_NAME = "Vertice";
const BRAND_HTML = "V&eacute;rtice";
const BRAND_COLOR = "#0f766e";
const BRAND_DARK = "#134e4a";
const BORDER_COLOR = "#d8ece8";
const TEXT_COLOR = "#1f2937";
const MUTED_COLOR = "#64748b";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatValue(value: EmailInfoItem["value"]) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(value);
  }
  return String(value);
}

function renderInfoRows(items: EmailInfoItem[] = []) {
  const rows = items
    .map((item) => ({ label: item.label, value: formatValue(item.value) }))
    .filter((item): item is { label: string; value: string } => Boolean(item.value));

  if (rows.length === 0) return "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0; border: 1px solid ${BORDER_COLOR}; border-radius: 8px; background: #f7fbfa;">
      <tr>
        <td style="padding: 16px 18px;">
          <p style="margin: 0 0 10px; color: ${BRAND_DARK}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700;">Informacoes adicionais</p>
          ${rows
            .map(
              (item) => `
                <p style="margin: 6px 0; color: ${TEXT_COLOR}; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px;">
                  <strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}
                </p>
              `,
            )
            .join("")}
        </td>
      </tr>
    </table>
  `;
}

function renderAction(action?: EmailAction) {
  if (!action) return "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td bgcolor="${BRAND_COLOR}" style="border-radius: 7px;">
          <a href="${escapeHtml(action.url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 13px 20px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; text-decoration: none;">
            ${escapeHtml(action.label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function renderEmailLayout(input: LayoutInput): EmailContent {
  const securityNote =
    input.securityNote ??
    "Se voce nao reconhece esta mensagem, ignore este e-mail ou fale com o administrador da sua empresa.";
  const textLines = [
    BRAND_NAME,
    "",
    input.title,
    "",
    input.greeting,
    ...input.paragraphs,
    input.action ? "" : undefined,
    input.action ? `${input.action.label}: ${input.action.url}` : undefined,
    input.infoItems?.some((item) => formatValue(item.value)) ? "" : undefined,
    input.infoItems?.some((item) => formatValue(item.value)) ? "Informacoes adicionais:" : undefined,
    ...(input.infoItems ?? [])
      .map((item) => ({ label: item.label, value: formatValue(item.value) }))
      .filter((item): item is { label: string; value: string } => Boolean(item.value))
      .map((item) => `- ${item.label}: ${item.value}`),
    "",
    securityNote,
    "",
    `(c) ${BRAND_NAME}`,
    input.footerNote ?? "Este e um e-mail automatico. Nao responda.",
  ].filter((line): line is string => typeof line === "string");

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #eef7f5;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      ${escapeHtml(input.preheader)}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #eef7f5; margin: 0; padding: 28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background: #ffffff; border: 1px solid ${BORDER_COLOR}; border-radius: 10px; overflow: hidden;">
            <tr>
              <td style="padding: 22px 28px; background: ${BRAND_DARK};">
                <p style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 0;">${BRAND_HTML}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px 28px 26px;">
                <h1 style="margin: 0 0 16px; color: ${BRAND_DARK}; font-family: Arial, Helvetica, sans-serif; font-size: 24px; line-height: 31px; font-weight: 700;">${escapeHtml(input.title)}</h1>
                ${
                  input.greeting
                    ? `<p style="margin: 0 0 14px; color: ${TEXT_COLOR}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 24px;">${escapeHtml(input.greeting)}</p>`
                    : ""
                }
                ${input.paragraphs
                  .map(
                    (paragraph) =>
                      `<p style="margin: 0 0 14px; color: ${TEXT_COLOR}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 24px;">${escapeHtml(paragraph)}</p>`,
                  )
                  .join("")}
                ${renderAction(input.action)}
                ${renderInfoRows(input.infoItems)}
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px; border-left: 4px solid ${BRAND_COLOR}; background: #f1faf8;">
                  <tr>
                    <td style="padding: 14px 16px;">
                      <p style="margin: 0; color: ${MUTED_COLOR}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px;">${escapeHtml(securityNote)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 28px 24px; background: #f8fcfb; border-top: 1px solid ${BORDER_COLOR};">
                <p style="margin: 0 0 6px; color: ${BRAND_DARK}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700;">&copy; ${BRAND_HTML}</p>
                <p style="margin: 0; color: ${MUTED_COLOR}; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;">${escapeHtml(input.footerNote ?? "Este e um e-mail automatico. Nao responda.")}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: input.subject,
    textBody: textLines.join("\n"),
    htmlBody: html,
  };
}

export function buildUserInviteEmail(input: {
  userName: string;
  companyName: string;
  invitedByName?: string | null;
  inviteUrl: string;
  expiresAt: Date;
}) {
  return renderEmailLayout({
    subject: `Convite para acessar o ${BRAND_NAME}`,
    preheader: `Voce foi convidado para acessar a empresa ${input.companyName} no ${BRAND_NAME}.`,
    title: "Voce recebeu um convite",
    greeting: `Ola, ${input.userName}.`,
    paragraphs: [
      `Voce foi convidado para acessar a empresa ${input.companyName} no ${BRAND_NAME}.`,
      input.invitedByName
        ? `${input.invitedByName} enviou este convite para voce criar sua senha e entrar no sistema.`
        : "Use o link abaixo para criar sua senha e entrar no sistema.",
      "Por seguranca, o convite e temporario e so pode ser usado uma vez.",
    ],
    action: { label: "Aceitar convite", url: input.inviteUrl },
    infoItems: [
      { label: "Empresa", value: input.companyName },
      { label: "Validade", value: input.expiresAt },
      { label: "Convidado por", value: input.invitedByName },
    ],
    securityNote: "Se voce nao esperava este convite, ignore este e-mail ou fale com o administrador da empresa.",
  });
}

export function buildPasswordResetEmail(input: {
  userName: string;
  companyName: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  return renderEmailLayout({
    subject: `Redefinicao de senha ${BRAND_NAME}`,
    preheader: "Use o link seguro para redefinir sua senha.",
    title: "Redefina sua senha",
    greeting: `Ola, ${input.userName}.`,
    paragraphs: [
      `Recebemos uma solicitacao para redefinir a senha da sua conta em ${input.companyName}.`,
      "Clique no botao abaixo para criar uma nova senha. O link e temporario e so pode ser usado uma vez.",
    ],
    action: { label: "Redefinir senha", url: input.resetUrl },
    infoItems: [
      { label: "Empresa", value: input.companyName },
      { label: "Validade", value: input.expiresAt },
    ],
    securityNote: "Se voce nao solicitou a redefinicao, ignore este e-mail. Sua senha atual continuara a mesma.",
  });
}

export function buildCompanyCreatedEmail(input: { companyName: string; appUrl: string }) {
  return renderEmailLayout({
    subject: `Empresa criada no ${BRAND_NAME}`,
    preheader: `${input.companyName} ja esta pronta para acessar o ${BRAND_NAME}.`,
    title: "Empresa criada com sucesso",
    paragraphs: [
      `A empresa ${input.companyName} foi criada no ${BRAND_NAME}.`,
      "Acesse o sistema para revisar os dados iniciais, cadastrar usuarios e configurar a operacao.",
    ],
    action: { label: "Acessar o sistema", url: input.appUrl },
    infoItems: [{ label: "Empresa", value: input.companyName }],
  });
}

export function buildCompanySuspendedEmail(input: {
  companyName: string;
  reason?: string | null;
  supportEmail?: string | null;
}) {
  return renderEmailLayout({
    subject: `Empresa suspensa no ${BRAND_NAME}`,
    preheader: `O acesso da empresa ${input.companyName} foi suspenso.`,
    title: "Acesso temporariamente suspenso",
    paragraphs: [
      `O acesso da empresa ${input.companyName} foi suspenso.`,
      input.supportEmail
        ? `Para regularizar ou tirar duvidas, entre em contato pelo e-mail ${input.supportEmail}.`
        : "Para regularizar ou tirar duvidas, entre em contato com o administrador da plataforma.",
    ],
    infoItems: [
      { label: "Empresa", value: input.companyName },
      { label: "Motivo", value: input.reason },
    ],
  });
}

export function buildCompanyReactivatedEmail(input: { companyName: string; appUrl: string }) {
  return renderEmailLayout({
    subject: `Empresa reativada no ${BRAND_NAME}`,
    preheader: `O acesso da empresa ${input.companyName} foi reativado.`,
    title: "Empresa reativada",
    paragraphs: [`O acesso da empresa ${input.companyName} foi reativado. Voce ja pode voltar a usar o sistema.`],
    action: { label: "Acessar o sistema", url: input.appUrl },
    infoItems: [{ label: "Empresa", value: input.companyName }],
  });
}

export function buildStockAlertEmail(input: {
  companyName: string;
  itemName: string;
  currentQuantity: string | number;
  minimumQuantity: string | number;
  occurredAt: Date;
  stockUrl?: string;
}) {
  return renderEmailLayout({
    subject: `Alerta de estoque: ${input.itemName}`,
    preheader: `${input.itemName} esta abaixo do estoque minimo.`,
    title: "Alerta de estoque",
    paragraphs: [`O item ${input.itemName} esta abaixo do estoque minimo configurado.`],
    action: input.stockUrl ? { label: "Acessar estoque", url: input.stockUrl } : undefined,
    infoItems: [
      { label: "Empresa", value: input.companyName },
      { label: "Item", value: input.itemName },
      { label: "Quantidade atual", value: input.currentQuantity },
      { label: "Estoque minimo", value: input.minimumQuantity },
      { label: "Data", value: input.occurredAt },
    ],
  });
}

export function buildOperationalNotificationEmail(input: {
  type: "Producao" | "Pedido" | "Administrativo";
  title: string;
  identifier?: string | null;
  status?: string | null;
  responsibleName?: string | null;
  recordUrl?: string;
  companyName?: string | null;
}) {
  return renderEmailLayout({
    subject: `${input.type}: ${input.title}`,
    preheader: `Nova notificacao de ${input.type.toLowerCase()} no ${BRAND_NAME}.`,
    title: input.title,
    paragraphs: [`Ha uma nova notificacao de ${input.type.toLowerCase()} para acompanhar no sistema.`],
    action: input.recordUrl ? { label: "Acessar registro", url: input.recordUrl } : undefined,
    infoItems: [
      { label: "Tipo", value: input.type },
      { label: "Identificacao", value: input.identifier },
      { label: "Status", value: input.status },
      { label: "Responsavel", value: input.responsibleName },
      { label: "Empresa", value: input.companyName },
    ],
  });
}
