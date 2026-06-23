import { prisma } from "@/lib/prisma";

export async function ensureDefaultCatalog(companyId: string) {
  return prisma.$transaction(async (tx) => {
    const unit = await tx.unit.upsert({
      where: { companyId_symbol: { companyId, symbol: "UN" } },
      update: { name: "Unidade", allowsFraction: false, status: "ACTIVE" },
      create: {
        companyId,
        name: "Unidade",
        symbol: "UN",
        allowsFraction: false,
      },
    });

    const category = await tx.itemCategory.upsert({
      where: { companyId_name: { companyId, name: "Geral" } },
      update: { status: "ACTIVE" },
      create: {
        companyId,
        name: "Geral",
      },
    });

    return { unit, category };
  });
}

