import type { Prisma } from "../../generated/prisma/client";
import { getServerEnv } from "@/lib/env";

export type EmailPurpose = "password_reset" | "user_invite";

export function buildTokenUrl(pathname: string, token: string) {
  const url = new URL(pathname, getServerEnv().APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function enqueueEmail(
  tx: Prisma.TransactionClient,
  input: {
    companyId?: string;
    userId?: string;
    recipientEmail: string;
    subject: string;
    body: string;
    htmlBody?: string;
    purpose: EmailPurpose;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const metadata = {
    ...(typeof input.metadata === "object" && input.metadata && !Array.isArray(input.metadata) ? input.metadata : {}),
    ...(input.htmlBody ? { email: { htmlBody: input.htmlBody } } : {}),
  };

  return tx.emailOutbox.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      body: input.body,
      purpose: input.purpose,
      metadata,
    },
  });
}
