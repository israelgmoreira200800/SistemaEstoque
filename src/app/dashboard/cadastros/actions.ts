"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/lib/auth/session";
import { consumeUsageLimit, syncUsageLimitCounter } from "@/lib/billing/usage-limits";
import { createCategorySchema, createItemSchema, createUnitSchema, unitConversionSchema, updateCategorySchema, updateItemSchema, updateUnitSchema } from "@/lib/catalog/validation";
import { productComponentSchema } from "@/lib/production/validation";
import { prisma } from "@/lib/prisma";
import { isWholeQuantity } from "@/lib/stock/quantity";
import { quantitySchema } from "@/lib/stock/validation";

export type CatalogActionState = { success?: string; error?: string };

function hasAnyPermission(grantedPermissions: ReadonlySet<string>, permissions: string[]) {
  return permissions.some((permission) => grantedPermissions.has(permission));
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function saveBomComponentAction(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const session = await requireSession();
  const parsed = productComponentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  if (parsed.data.productId === parsed.data.componentItemId) {
    return { error: "O produto nao pode ser componente dele mesmo." };
  }

  const existing = await prisma.productComponent.findUnique({
    where: {
      companyId_productId_componentItemId: {
        companyId: session.company.id,
        productId: parsed.data.productId,
        componentItemId: parsed.data.componentItemId,
      },
    },
    select: { id: true },
  });
  const canSaveComponent = existing
    ? hasAnyPermission(session.permissions, ["bom.update", "recipe.update", "item.update", "permission.manage"])
    : hasAnyPermission(session.permissions, ["bom.create", "recipe.create", "item.update", "permission.manage"]);
  if (!canSaveComponent) {
    return { error: "Voce nao tem permissao para gerenciar ficha tecnica." };
  }

  const [product, component] = await Promise.all([
    prisma.item.findFirst({
      where: {
        id: parsed.data.productId,
        companyId: session.company.id,
        status: "ACTIVE",
        type: { in: ["FINISHED_PRODUCT", "INTERMEDIATE", "RESALE"] },
      },
    }),
    prisma.item.findFirst({
      where: { id: parsed.data.componentItemId, companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
    }),
  ]);

  if (!product || !component) return { error: "Produto ou componente invalido." };
  if (!component.unit.allowsFraction && !isWholeQuantity(parsed.data.quantity)) {
    return { error: "A unidade do componente nao permite quantidade fracionada." };
  }

  const componentRecord = await prisma.$transaction(async (tx) => {
    const saved = await tx.productComponent.upsert({
      where: {
        companyId_productId_componentItemId: {
          companyId: session.company.id,
          productId: parsed.data.productId,
          componentItemId: parsed.data.componentItemId,
        },
      },
      update: { quantity: parsed.data.quantity, status: "ACTIVE" },
      create: { companyId: session.company.id, ...parsed.data },
    });
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: existing ? "bom.component.updated" : "bom.component.created",
        entityType: "product_component",
        entityId: saved.id,
        metadata: parsed.data,
      },
    });
    return saved;
  });

  revalidatePath(`/dashboard/cadastros/itens/${componentRecord.productId}`);
  revalidatePath(`/dashboard/itens/${componentRecord.productId}`);
  revalidatePath("/dashboard/producao");
  return { success: "Componente salvo na ficha tecnica." };
}

export async function inactivateBomComponentAction(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const session = await requireSession();
  if (!hasAnyPermission(session.permissions, ["bom.inactivate", "recipe.inactivate", "item.update", "permission.manage"])) {
    return { error: "Voce nao tem permissao para inativar componente da ficha tecnica." };
  }
  const id = String(formData.get("id") ?? "");
  const component = await prisma.productComponent.findFirst({ where: { id, companyId: session.company.id } });
  if (!component) return { error: "Componente nao encontrado." };

  await prisma.$transaction([
    prisma.productComponent.updateMany({ where: { id: component.id, companyId: session.company.id }, data: { status: "INACTIVE" } }),
    prisma.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "bom.component.inactivated",
        entityType: "product_component",
        entityId: component.id,
      },
    }),
  ]);

  revalidatePath(`/dashboard/cadastros/itens/${component.productId}`);
  revalidatePath(`/dashboard/itens/${component.productId}`);
  revalidatePath("/dashboard/producao");
  return { success: "Componente removido da ficha tecnica." };
}

export async function createUnitAction(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const session = await requirePermission("unit.create");
  const parsed = createUnitSchema.safeParse({
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    allowsFraction: formData.get("allowsFraction") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({ data: { companyId: session.company.id, ...parsed.data } });
      await tx.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: "catalog.unit.created", entityType: "unit", entityId: unit.id, metadata: { name: unit.name, symbol: unit.symbol } } });
    });
    revalidatePath("/dashboard/itens");
    revalidatePath("/dashboard/cadastros");
    return { success: "Unidade cadastrada." };
  } catch (error) {
    return { error: isUniqueError(error) ? "Já existe uma unidade com esse símbolo." : "Não foi possível cadastrar a unidade." };
  }
}

export async function createCategoryAction(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const session = await requirePermission("category.create");
  const parsed = createCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await prisma.$transaction(async (tx) => {
      const category = await tx.itemCategory.create({ data: { companyId: session.company.id, ...parsed.data } });
      await tx.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: "catalog.category.created", entityType: "item_category", entityId: category.id, metadata: { name: category.name } } });
    });
    revalidatePath("/dashboard/itens");
    revalidatePath("/dashboard/cadastros");
    return { success: "Categoria cadastrada." };
  } catch (error) {
    return { error: isUniqueError(error) ? "Já existe uma categoria com esse nome." : "Não foi possível cadastrar a categoria." };
  }
}

export async function createItemAction(
  _state: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const session = await requirePermission("item.create");
  const parsed = createItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const componentIds = formData.getAll("componentItemId").map((value) => String(value));
  const componentQuantities = formData.getAll("componentQuantity").map((value) => String(value));
  const bomComponents = componentIds
    .map((componentItemId, index) => ({ componentItemId, quantity: componentQuantities[index] ?? "" }))
    .filter((component) => component.componentItemId || component.quantity);
  const isProductWithBom = parsed.data.type === "FINISHED_PRODUCT";

  if (!isProductWithBom && bomComponents.length > 0) {
    return { error: "Componentes so podem ser informados para produto acabado neste cadastro." };
  }
  for (const component of bomComponents) {
    if (!component.componentItemId || !component.quantity) {
      return { error: "Informe componente e quantidade em todas as linhas da ficha tecnica." };
    }
    const quantity = quantitySchema.safeParse(component.quantity);
    if (!quantity.success) return { error: quantity.error.issues[0]?.message ?? "Quantidade do componente invalida." };
    component.quantity = quantity.data;
  }
  const duplicatedComponent = bomComponents.find((component, index) => bomComponents.findIndex((row) => row.componentItemId === component.componentItemId) !== index);
  if (duplicatedComponent) return { error: "Nao repita o mesmo componente na ficha tecnica." };

  const [unit, category] = await Promise.all([
    prisma.unit.findFirst({ where: { id: parsed.data.unitId, companyId: session.company.id, status: "ACTIVE" }, select: { id: true, allowsFraction: true } }),
    parsed.data.categoryId
      ? prisma.itemCategory.findFirst({ where: { id: parsed.data.categoryId, companyId: session.company.id, status: "ACTIVE" }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!unit) return { error: "A unidade selecionada não pertence à empresa ou está inativa." };
  if (parsed.data.categoryId && !category) return { error: "A categoria selecionada não pertence à empresa ou está inativa." };
  if (!unit.allowsFraction && !Number.isInteger(Number(parsed.data.minimumStock))) return { error: "Essa unidade não permite estoque mínimo fracionário." };
  const componentRecords = bomComponents.length
    ? await prisma.item.findMany({
        where: { id: { in: bomComponents.map((component) => component.componentItemId) }, companyId: session.company.id, status: "ACTIVE" },
        include: { unit: true },
      })
    : [];
  if (componentRecords.length !== bomComponents.length) {
    return { error: "Um ou mais componentes nao pertencem a empresa ou estao inativos." };
  }
  for (const component of bomComponents) {
    const componentRecord = componentRecords.find((item) => item.id === component.componentItemId);
    if (componentRecord && !componentRecord.unit.allowsFraction && !isWholeQuantity(component.quantity)) {
      return { error: `A unidade de ${componentRecord.name} nao permite quantidade fracionaria.` };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const usage = await consumeUsageLimit(tx, {
        companyId: session.company.id,
        key: "items",
      });
      if (!usage.allowed) return { error: usage.error };

      const item = await tx.item.create({ data: { companyId: session.company.id, ...parsed.data } });
      if (bomComponents.length > 0) {
        await tx.productComponent.createMany({
          data: bomComponents.map((component) => ({
            companyId: session.company.id,
            productId: item.id,
            componentItemId: component.componentItemId,
            quantity: component.quantity,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "catalog.item.created",
          entityType: "item",
          entityId: item.id,
          metadata: { name: item.name, sku: item.sku, type: item.type, bomComponents: bomComponents.length },
        },
      });
      return { success: true };
    });
    if ("error" in result) return { error: result.error };
    revalidatePath("/dashboard/itens");
    revalidatePath("/dashboard/cadastros");
    revalidatePath("/dashboard/producao");
    return { success: bomComponents.length > 0 ? "Item cadastrado com ficha tecnica." : "Item cadastrado." };
  } catch (error) {
    return { error: isUniqueError(error) ? "SKU ou código de barras já utilizado nesta empresa." : "Não foi possível cadastrar o item." };
  }
}

export async function updateUnitAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("unit.update");
  const parsed = updateUnitSchema.safeParse({ ...Object.fromEntries(formData), allowsFraction: formData.get("allowsFraction") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const current = await prisma.unit.findFirst({ where: { id: parsed.data.id, companyId: session.company.id } });
  if (!current) return { error: "Unidade não encontrada." };
  try {
    await prisma.$transaction([
      prisma.unit.updateMany({ where: { id: current.id, companyId: session.company.id }, data: { name: parsed.data.name, symbol: parsed.data.symbol, allowsFraction: parsed.data.allowsFraction } }),
      prisma.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: "catalog.unit.updated", entityType: "unit", entityId: current.id, metadata: { before: { name: current.name, symbol: current.symbol }, after: parsed.data } } }),
    ]);
    revalidatePath("/dashboard/itens");
    revalidatePath("/dashboard/cadastros");
    return { success: "Unidade atualizada." };
  } catch (error) { return { error: isUniqueError(error) ? "Símbolo já utilizado nesta empresa." : "Não foi possível atualizar a unidade." }; }
}

export async function toggleUnitAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("unit.inactivate");
  const id = String(formData.get("id") ?? "");
  const unit = await prisma.unit.findFirst({ where: { id, companyId: session.company.id } });
  if (!unit) return { error: "Unidade não encontrada." };
  const nextStatus = unit.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  if (nextStatus === "INACTIVE") {
    const usage = await prisma.item.count({ where: { companyId: session.company.id, unitId: unit.id, status: "ACTIVE" } });
    if (usage > 0) return { error: "A unidade está vinculada a itens ativos." };
  }
  await prisma.$transaction([
    prisma.unit.updateMany({ where: { id: unit.id, companyId: session.company.id }, data: { status: nextStatus } }),
    prisma.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: `catalog.unit.${nextStatus === "ACTIVE" ? "activated" : "inactivated"}`, entityType: "unit", entityId: unit.id } }),
  ]);
  revalidatePath("/dashboard/itens");
  revalidatePath("/dashboard/cadastros");
  return { success: nextStatus === "ACTIVE" ? "Unidade ativada." : "Unidade inativada." };
}

export async function updateCategoryAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("category.update");
  const parsed = updateCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const current = await prisma.itemCategory.findFirst({ where: { id: parsed.data.id, companyId: session.company.id } });
  if (!current) return { error: "Categoria não encontrada." };
  try {
    await prisma.$transaction([
      prisma.itemCategory.updateMany({ where: { id: current.id, companyId: session.company.id }, data: { name: parsed.data.name } }),
      prisma.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: "catalog.category.updated", entityType: "item_category", entityId: current.id, metadata: { before: { name: current.name }, after: parsed.data } } }),
    ]);
    revalidatePath("/dashboard/itens");
    revalidatePath("/dashboard/cadastros");
    return { success: "Categoria atualizada." };
  } catch (error) { return { error: isUniqueError(error) ? "Nome já utilizado nesta empresa." : "Não foi possível atualizar a categoria." }; }
}

export async function toggleCategoryAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("category.inactivate");
  const id = String(formData.get("id") ?? "");
  const category = await prisma.itemCategory.findFirst({ where: { id, companyId: session.company.id } });
  if (!category) return { error: "Categoria não encontrada." };
  const nextStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.$transaction([
    prisma.itemCategory.updateMany({ where: { id: category.id, companyId: session.company.id }, data: { status: nextStatus } }),
    prisma.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: `catalog.category.${nextStatus === "ACTIVE" ? "activated" : "inactivated"}`, entityType: "item_category", entityId: category.id } }),
  ]);
  revalidatePath("/dashboard/itens");
  revalidatePath("/dashboard/cadastros");
  return { success: nextStatus === "ACTIVE" ? "Categoria ativada." : "Categoria inativada." };
}

export async function updateItemAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("item.update");
  const parsed = updateItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const current = await prisma.item.findFirst({ where: { id: parsed.data.id, companyId: session.company.id } });
  if (!current) return { error: "Item não encontrado." };
  const [unit, category, conflictingConversion] = await Promise.all([
    prisma.unit.findFirst({ where: { id: parsed.data.unitId, companyId: session.company.id, status: "ACTIVE" } }),
    parsed.data.categoryId ? prisma.itemCategory.findFirst({ where: { id: parsed.data.categoryId, companyId: session.company.id, status: "ACTIVE" } }) : null,
    prisma.itemUnitConversion.findFirst({ where: { itemId: current.id, sourceUnitId: parsed.data.unitId, status: "ACTIVE" } }),
  ]);
  if (!unit) return { error: "Unidade inválida ou inativa." };
  if (parsed.data.categoryId && !category) return { error: "Categoria inválida ou inativa." };
  if (conflictingConversion) return { error: "A nova unidade principal já está cadastrada como alternativa." };
  if (!unit.allowsFraction && !Number.isInteger(Number(parsed.data.minimumStock))) return { error: "Essa unidade não permite estoque mínimo fracionário." };
  try {
    await prisma.$transaction([
      prisma.item.updateMany({ where: { id: current.id, companyId: session.company.id }, data: { name: parsed.data.name, type: parsed.data.type, unitId: parsed.data.unitId, categoryId: parsed.data.categoryId, sku: parsed.data.sku, barcode: parsed.data.barcode, minimumStock: parsed.data.minimumStock, description: parsed.data.description } }),
      prisma.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: "catalog.item.updated", entityType: "item", entityId: current.id, metadata: { before: { name: current.name, sku: current.sku }, after: { name: parsed.data.name, sku: parsed.data.sku } } } }),
    ]);
    revalidatePath(`/dashboard/cadastros/itens/${current.id}`); revalidatePath(`/dashboard/itens/${current.id}`); revalidatePath("/dashboard/itens"); revalidatePath("/dashboard/cadastros");
    return { success: "Item atualizado." };
  } catch (error) { return { error: isUniqueError(error) ? "SKU ou código de barras já utilizado nesta empresa." : "Não foi possível atualizar o item." }; }
}

export async function toggleItemAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("item.inactivate");
  const id = String(formData.get("id") ?? "");
  const item = await prisma.item.findFirst({ where: { id, companyId: session.company.id } });
  if (!item) return { error: "Item não encontrado." };
  const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const result = await prisma.$transaction(async (tx) => {
    if (nextStatus === "ACTIVE") {
      const usage = await consumeUsageLimit(tx, {
        companyId: session.company.id,
        key: "items",
      });
      if (!usage.allowed) return { error: usage.error };
    }

    await tx.item.updateMany({ where: { id: item.id, companyId: session.company.id }, data: { status: nextStatus } });
    if (nextStatus === "INACTIVE") {
      await syncUsageLimitCounter(tx, { companyId: session.company.id, key: "items" });
    }
    await tx.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: `catalog.item.${nextStatus === "ACTIVE" ? "activated" : "inactivated"}`, entityType: "item", entityId: item.id } });

    return { success: true };
  });

  if ("error" in result) return { error: result.error };
  revalidatePath(`/dashboard/cadastros/itens/${item.id}`); revalidatePath(`/dashboard/itens/${item.id}`); revalidatePath("/dashboard/itens"); revalidatePath("/dashboard/cadastros");
  return { success: nextStatus === "ACTIVE" ? "Item ativado." : "Item inativado." };
}

export async function createUnitConversionAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("unit.update");
  const parsed = unitConversionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const [item, sourceUnit] = await Promise.all([
    prisma.item.findFirst({ where: { id: parsed.data.itemId, companyId: session.company.id } }),
    prisma.unit.findFirst({ where: { id: parsed.data.sourceUnitId, companyId: session.company.id, status: "ACTIVE" } }),
  ]);
  if (!item || !sourceUnit) return { error: "Item ou unidade alternativa inválidos." };
  if (item.unitId === sourceUnit.id) return { error: "Escolha uma unidade diferente da unidade de estoque." };
  try {
    await prisma.$transaction(async (tx) => {
      const conversion = await tx.itemUnitConversion.create({ data: { companyId: session.company.id, ...parsed.data } });
      await tx.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: "catalog.unit_conversion.created", entityType: "item_unit_conversion", entityId: conversion.id, metadata: { itemId: item.id, sourceUnitId: sourceUnit.id, factor: parsed.data.factorToStockUnit } } });
    });
    revalidatePath(`/dashboard/cadastros/itens/${item.id}`);
    revalidatePath(`/dashboard/itens/${item.id}`);
    return { success: "Conversão cadastrada." };
  } catch (error) { return { error: isUniqueError(error) ? "Essa unidade alternativa já foi configurada para o item." : "Não foi possível cadastrar a conversão." }; }
}

export async function toggleUnitConversionAction(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const session = await requirePermission("unit.update");
  const id = String(formData.get("id") ?? "");
  const conversion = await prisma.itemUnitConversion.findFirst({ where: { id, companyId: session.company.id } });
  if (!conversion) return { error: "Conversão não encontrada." };
  const nextStatus = conversion.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.$transaction([
    prisma.itemUnitConversion.updateMany({ where: { id: conversion.id, companyId: session.company.id }, data: { status: nextStatus } }),
    prisma.auditLog.create({ data: { companyId: session.company.id, userId: session.user.id, action: `catalog.unit_conversion.${nextStatus === "ACTIVE" ? "activated" : "inactivated"}`, entityType: "item_unit_conversion", entityId: conversion.id } }),
  ]);
  revalidatePath(`/dashboard/cadastros/itens/${conversion.itemId}`);
  revalidatePath(`/dashboard/itens/${conversion.itemId}`);
  return { success: nextStatus === "ACTIVE" ? "Conversão ativada." : "Conversão inativada." };
}
