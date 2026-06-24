"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCurrentPlatformSession,
  getCurrentPlatformSession,
  requirePlatformSession,
} from "@/lib/auth/platform-session";
import { hashPassword } from "@/lib/auth/password";
import { createCompanyOnboarding, slugifyTenant } from "@/lib/organization/onboarding";
import {
  platformCompanySchema,
  platformCompanyStatusSchema,
} from "@/lib/platform/validation";
import { prisma } from "@/lib/prisma";

export type PlatformCompanyActionState = { success?: string; error?: string };

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function uniqueErrorMessage(error: unknown) {
  if (!isUniqueError(error)) return "Nao foi possivel criar a empresa.";
  const target = typeof error === "object" && error !== null && "meta" in error
    ? (error.meta as { target?: unknown }).target
    : undefined;
  const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");

  if (targetText.includes("email")) return "Ja existe usuario com esse e-mail.";
  if (targetText.includes("slug")) return "Ja existe uma empresa com esse slug.";
  return "Ja existe cadastro com esses dados.";
}

export async function createPlatformCompanyAction(
  _state: PlatformCompanyActionState,
  formData: FormData,
): Promise<PlatformCompanyActionState> {
  const session = await requirePlatformSession();
  const parsed = platformCompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const slug = slugifyTenant(parsed.data.slug ?? parsed.data.name);
  if (!slug) return { error: "Informe um slug valido para a empresa." };

  const plan = await prisma.plan.findFirst({ where: { id: parsed.data.planId, status: "ACTIVE" } });
  if (!plan) return { error: "Plano invalido ou inativo." };

  const trialDays = parsed.data.trialDays ?? plan?.trialDays ?? 14;
  const passwordHash = await hashPassword(parsed.data.adminPassword);

  try {
    const { company } = await prisma.$transaction(async (tx) =>
      createCompanyOnboarding(tx, {
        platformUserId: session.user.id,
        company: {
          name: parsed.data.name,
          slug,
          legalName: parsed.data.legalName,
          tradeName: parsed.data.tradeName,
          document: parsed.data.document,
          email: parsed.data.email,
          phone: parsed.data.phone,
          timezone: parsed.data.timezone,
          status: parsed.data.status,
          planId: plan.id,
          trialDays,
        },
        admin: {
          name: parsed.data.adminName,
          email: parsed.data.adminEmail,
          passwordHash,
        },
      }),
    );

    revalidatePath("/platform");
    revalidatePath("/platform/companies");
    revalidatePath(`/platform/companies/${company.id}`);
    return { success: "Empresa e administrador preparados." };
  } catch (error) {
    return { error: uniqueErrorMessage(error) };
  }
}

export async function changePlatformCompanyStatusAction(
  _state: PlatformCompanyActionState,
  formData: FormData,
): Promise<PlatformCompanyActionState> {
  const session = await requirePlatformSession();
  const parsed = platformCompanyStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const company = await prisma.company.findUnique({ where: { id: parsed.data.companyId } });
  if (!company) return { error: "Empresa nao encontrada." };

  const now = new Date();
  const data =
    parsed.data.operation === "activate" || parsed.data.operation === "reactivate"
      ? {
          status: "ACTIVE" as const,
          activatedAt: now,
          suspendedAt: null,
          suspensionReason: null,
        }
      : parsed.data.operation === "suspend"
        ? {
            status: "SUSPENDED" as const,
            suspendedAt: now,
            suspensionReason: parsed.data.reason,
          }
        : {
            status: "CANCELLED" as const,
            cancelledAt: now,
            cancellationReason: parsed.data.reason,
          };

  await prisma.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { id: company.id },
      data,
    });

    if (updated.status === "SUSPENDED" || updated.status === "CANCELLED") {
      await tx.session.deleteMany({ where: { companyId: updated.id } });
    }

    const subscriptionStatus =
      updated.status === "ACTIVE"
        ? "ACTIVE"
        : updated.status === "TRIAL"
          ? "TRIALING"
          : updated.status === "SUSPENDED"
            ? "SUSPENDED"
            : "CANCELLED";
    await tx.subscription.updateMany({
      where: { companyId: updated.id, status: { not: "EXPIRED" } },
      data: {
        status: subscriptionStatus,
        cancelledAt: updated.status === "CANCELLED" ? now : undefined,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        platformUserId: session.user.id,
        companyId: updated.id,
        action: `platform.company.${parsed.data.operation}`,
        entityType: "company",
        entityId: updated.id,
        reason: parsed.data.reason,
        metadata: { before: company.status, after: updated.status },
      },
    });
  });

  revalidatePath("/platform");
  revalidatePath("/platform/companies");
  revalidatePath(`/platform/companies/${company.id}`);
  return { success: "Status da empresa atualizado." };
}

export async function platformLogoutAction() {
  const session = await getCurrentPlatformSession();
  if (session) {
    await prisma.platformAuditLog.create({
      data: {
        platformUserId: session.user.id,
        action: "platform.auth.logout",
      },
    });
  }
  await destroyCurrentPlatformSession();
  redirect("/platform/login");
}
