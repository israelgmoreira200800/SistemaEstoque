"use server";

import { redirect } from "next/navigation";
import { destroyCurrentSession, getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function logoutAction() {
  const session = await getCurrentSession();
  if (session) {
    await prisma.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "auth.logout",
      },
    });
  }
  await destroyCurrentSession();
  redirect("/login");
}

