import { canAccessCompany } from "@/lib/auth/company-access";
import { addTokenDays, createAccountToken, hashAccountToken, isExpired } from "@/lib/auth/account-tokens";
import { hashPassword } from "@/lib/auth/password";
import { consumeUsageLimit } from "@/lib/billing/usage-limits";
import { buildTokenUrl, enqueueEmail } from "@/lib/email/outbox";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../generated/prisma/client";

const INVITE_DAYS = 7;

export type InvitationResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function createUserInvitation(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    userId: string;
    userName: string;
    userEmail: string;
    createdByUserId: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const { token, tokenHash } = createAccountToken();
  const expiresAt = addTokenDays(now, INVITE_DAYS);
  const inviteUrl = buildTokenUrl("/aceitar-convite", token);

  await tx.userInvitation.updateMany({
    where: { userId: input.userId, usedAt: null },
    data: { usedAt: now },
  });

  const invitation = await tx.userInvitation.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      tokenHash,
      expiresAt,
      createdByUserId: input.createdByUserId,
    },
  });

  const emailMessage = await enqueueEmail(tx, {
    companyId: input.companyId,
    userId: input.userId,
    recipientEmail: input.userEmail,
    subject: "Convite para acessar o Vertice",
    purpose: "user_invite",
    body: [
      `Ola, ${input.userName}.`,
      "",
      "Voce recebeu um convite para acessar o Vertice.",
      "Defina sua senha pelo link abaixo. Ele expira em 7 dias.",
      inviteUrl,
    ].join("\n"),
    metadata: { invitationId: invitation.id, expiresAt: expiresAt.toISOString() },
  });

  return { invitation, emailMessage };
}

export async function acceptUserInvitation(input: {
  token: string;
  password: string;
}): Promise<InvitationResult> {
  const tokenHash = hashAccountToken(input.token);
  const invitation = await prisma.userInvitation.findUnique({
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
    !invitation ||
    invitation.usedAt ||
    isExpired(invitation.expiresAt) ||
    invitation.user.status !== "BLOCKED" ||
    !canAccessCompany(invitation.user.company.status, invitation.user.company.subscriptions[0]?.status)
  ) {
    return { success: false, message: "Convite invalido ou expirado. Peca um novo convite ao administrador." };
  }

  const now = new Date();
  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const usage = await consumeUsageLimit(tx, {
      companyId: invitation.companyId,
      key: "users",
    });
    if (!usage.allowed) return { success: false as const, message: usage.error };

    const updatedInvitation = await tx.userInvitation.updateMany({
      where: { id: invitation.id, usedAt: null },
      data: { usedAt: now, acceptedAt: now },
    });
    if (updatedInvitation.count !== 1) {
      return { success: false as const, message: "Convite invalido ou expirado. Peca um novo convite ao administrador." };
    }

    await tx.user.updateMany({
      where: { id: invitation.userId, companyId: invitation.companyId },
      data: {
        status: "ACTIVE",
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.auditLog.create({
      data: {
        companyId: invitation.companyId,
        userId: invitation.userId,
        action: "user.invite.accepted",
        entityType: "user",
        entityId: invitation.userId,
      },
    });

    return { success: true as const, message: "Convite aceito. Entre com seu e-mail e senha." };
  });

  return result;
}
