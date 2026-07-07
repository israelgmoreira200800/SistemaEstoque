import nodemailer from "nodemailer";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type OutboxEmail = {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  metadata?: Prisma.JsonValue | null;
};

export function smtpConfigured() {
  const env = getServerEnv();
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);
}

function createTransport() {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) return null;
  const timeout = env.SMTP_DELIVERY_TIMEOUT_MS;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
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

function getHtmlBody(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return undefined;
  if (!("email" in metadata)) return undefined;
  const email = metadata.email;
  if (typeof email !== "object" || email === null || Array.isArray(email)) return undefined;
  if (!("htmlBody" in email) || typeof email.htmlBody !== "string") return undefined;
  return email.htmlBody;
}

function timeoutError(timeoutMs: number) {
  return new Error(`SMTP delivery timed out after ${timeoutMs}ms`);
}

function sendMailWithTimeout<T>(sendMail: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs);
  });

  return Promise.race([sendMail, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function deliverOutboxEmail(email: OutboxEmail) {
  const env = getServerEnv();
  const transport = createTransport();
  if (!transport || !env.SMTP_FROM) {
    return { delivered: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  try {
    const result = await sendMailWithTimeout(
      transport.sendMail({
        from: env.SMTP_FROM,
        to: email.recipientEmail,
        subject: email.subject,
        text: email.body,
        html: getHtmlBody(email.metadata),
      }),
      env.SMTP_DELIVERY_TIMEOUT_MS,
    );
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
  } finally {
    transport.close();
  }
}
