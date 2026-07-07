import { canAccessCompany } from "@/lib/auth/company-access";
import { createAccountToken, addMinutes, hashAccountToken, isExpired } from "@/lib/auth/account-tokens";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { enqueueEmail, buildTokenUrl } from "@/lib/email/outbox";
import { deliverOutboxEmail } from "@/lib/email/smtp";
import { buildPasswordResetEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_MINUTES = 30;
export const PASSWORD_RESET_REQUEST_MESSAGE =
  "Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir a senha.";

export type PasswordResetResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function requestPasswordReset(emailInput: string): Promise<PasswordResetResult> {
  const email = normalizeEmail(emailInput);
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: {
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      },
    },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !canAccessCompany(user.company.status, user.company.subscriptions[0]?.status)
  ) {
    return { success: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  const now = new Date();
  const { token, tokenHash } = createAccountToken();
  const expiresAt = addMinutes(now, PASSWORD_RESET_MINUTES);
  const resetUrl = buildTokenUrl("/redefinir-senha", token);

  const emailMessage = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });

    const resetToken = await tx.passwordResetToken.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const email = buildPasswordResetEmail({
      userName: user.name,
      companyName: user.company.name,
      resetUrl,
      expiresAt,
    });

    const queuedEmail = await enqueueEmail(tx, {
      companyId: user.companyId,
      userId: user.id,
      recipientEmail: user.email,
      subject: email.subject,
      purpose: "password_reset",
      body: email.textBody,
      htmlBody: email.htmlBody,
      metadata: { passwordResetTokenId: resetToken.id, expiresAt: expiresAt.toISOString() },
    });

    await tx.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "auth.password_reset.requested",
        entityType: "password_reset_token",
        entityId: resetToken.id,
        metadata: { emailOutboxId: queuedEmail.id, expiresAt: expiresAt.toISOString() },
      },
    });

    return queuedEmail;
  });

  await deliverOutboxEmail(emailMessage);

  return { success: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}): Promise<PasswordResetResult> {
  const tokenHash = hashAccountToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          company: {
            include: {
              subscriptions: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { status: true },
              },
            },
          },
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    isExpired(resetToken.expiresAt) ||
    resetToken.user.status !== "ACTIVE" ||
    !canAccessCompany(resetToken.user.company.status, resetToken.user.company.subscriptions[0]?.status)
  ) {
    return { success: false, message: "Link invalido ou expirado. Solicite uma nova recuperacao de senha." };
  }

  const now = new Date();
  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const updatedToken = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null },
      data: { usedAt: now },
    });
    if (updatedToken.count !== 1) {
      return { success: false as const, message: "Link invalido ou expirado. Solicite uma nova recuperacao de senha." };
    }

    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.session.deleteMany({ where: { userId: resetToken.userId } });
    await tx.auditLog.create({
      data: {
        companyId: resetToken.companyId,
        userId: resetToken.userId,
        action: "auth.password_reset.completed",
        entityType: "user",
        entityId: resetToken.userId,
      },
    });

    return { success: true as const, message: "Senha redefinida. Entre novamente para continuar." };
  });

  return result;
}
