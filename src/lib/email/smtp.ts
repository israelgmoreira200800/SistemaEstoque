import nodemailer from "nodemailer";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type OutboxEmail = {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

export function smtpConfigured() {
  const env = getServerEnv();
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);
}

function createTransport() {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASSWORD
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
  });
}

function mergeMetadata(metadata: unknown, delivery: Prisma.InputJsonValue) {
  return {
    ...(typeof metadata === "object" && metadata && !Array.isArray(metadata) ? metadata : {}),
    delivery,
  };
}

export async function deliverOutboxEmail(email: OutboxEmail) {
  const env = getServerEnv();
  const transport = createTransport();
  if (!transport || !env.SMTP_FROM) {
    return { delivered: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  try {
    const result = await transport.sendMail({
      from: env.SMTP_FROM,
      to: email.recipientEmail,
      subject: email.subject,
      text: email.body,
    });
    const current = await prisma.emailOutbox.findUnique({
      where: { id: email.id },
      select: { metadata: true },
    });

    await prisma.emailOutbox.update({
      where: { id: email.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        metadata: mergeMetadata(current?.metadata, {
          status: "SENT",
          smtpMessageId: result.messageId,
        }),
      },
    });

    return { delivered: true as const };
  } catch (error) {
    const current = await prisma.emailOutbox.findUnique({
      where: { id: email.id },
      select: { metadata: true },
    }).catch(() => null);
    await prisma.emailOutbox.update({
      where: { id: email.id },
      data: {
        status: "FAILED",
        metadata: mergeMetadata(current?.metadata, {
          status: "FAILED",
          error: error instanceof Error ? error.message.slice(0, 500) : "Unknown SMTP error",
        }),
      },
    }).catch(() => undefined);

    return {
      delivered: false as const,
      reason: "SMTP_DELIVERY_FAILED" as const,
    };
  }
}
