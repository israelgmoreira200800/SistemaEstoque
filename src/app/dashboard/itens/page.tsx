import Link from "next/link";
import { Boxes, ChevronLeft, ChevronRight, Layers3, Pencil, Ruler, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { ensureDefaultCatalog } from "@/lib/catalog/defaults";
import { prisma } from "@/lib/prisma";
import { CategoryForm, CategoryMaintenance, ItemForm, UnitForm, UnitMaintenance } from "../cadastros/catalog-forms";

const typeLabels: Record<string, string> = {
  RAW_MATERIAL: "Matéria-prima",
  PACKAGING: "Embalagem",
  COMPONENT: "Componente",
  INTERMEDIATE: "Intermediário",
  FINISHED_PRODUCT: "Produto acabado",
  RESALE: "Revenda",
  INTERNAL_CONSUMPTION: "Consumo interno",
};

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await requirePermission("item.view");
  if (session.permissions.has("item.create")) await ensureDefaultCatalog(session.company.id);

  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const requestedPage = Number(query.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const itemWhere = {
    companyId: session.company.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { barcode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [units, categories, items, itemCount, componentItems] = await Promise.all([
    prisma.unit.findMany({ where: { companyId: session.company.id }, orderBy: [{ status: "asc" }, { name: "asc" }] }),
    prisma.itemCategory.findMany({ where: { companyId: session.company.id }, orderBy: [{ status: "asc" }, { name: "asc" }] }),
    prisma.item.findMany({
      where: itemWhere,
      include: { unit: true, category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.item.count({ where: itemWhere }),
    prisma.item.findMany({
      where: { companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const activeUnits = units.filter((unit) => unit.status === "ACTIVE").map(({ id, name, symbol }) => ({ id, name, symbol }));
  const activeCategories = categories.filter((category) => category.status === "ACTIVE").map(({ id, name }) => ({ id, name }));
  const pageUrl = (target: number) => `/dashboard/itens?${new URLSearchParams({ ...(q ? { q } : {}), page: String(target) })}`;

  return (
    <>
      <PageHeader title="Itens" subtitle="Cadastre produtos, matérias-primas, embalagens e componentes." />
      <main className="page-body">
        {session.permissions.has("item.create") && (
          <section className="content-card catalog-card item-detail-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow"><Boxes size={14} /> Novo item</span>
                <h3>O que entra ou sai do estoque?</h3>
              </div>
            </div>
            <ItemForm
              units={activeUnits}
              categories={activeCategories}
              componentItems={componentItems.map((item) => ({ id: item.id, name: item.name, unit: item.unit.symbol, type: item.type }))}
            />
          </section>
        )}

        <section className="content-card table-card catalog-table">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Lista de itens</span>
              <h3>{itemCount} item{itemCount === 1 ? "" : "s"}</h3>
            </div>
            <form className="catalog-search">
              <Search size={15} />
              <input name="q" defaultValue={q} placeholder="Nome, SKU ou código" />
              <button className="text-button">Buscar</button>
            </form>
          </div>
          <div className="data-table">
            <div className="table-row table-head"><span>Item</span><span>Tipo</span><span>Categoria</span><span>Unidade</span><span /></div>
            {items.map((item) => (
              <div className="table-row" key={item.id}>
                <span className="person-cell" data-label="Item">
                  <span className={`metric-icon ${item.status === "ACTIVE" ? "metric-green" : "metric-muted"}`}><Boxes size={17} /></span>
                  <span><strong>{item.name}</strong><small>{item.sku ?? "Sem SKU"}{item.status === "INACTIVE" ? " · Inativo" : ""}</small></span>
                </span>
                <span data-label="Tipo">{typeLabels[item.type]}</span>
                <span data-label="Categoria">{item.category?.name ?? "—"}</span>
                <span data-label="Unidade">{item.unit.symbol}</span>
                <Link className="table-action" data-label="Ação" href={`/dashboard/itens/${item.id}`}><Pencil size={14} /> Editar</Link>
              </div>
            ))}
            {items.length === 0 && <p className="empty-state">Nenhum item encontrado.</p>}
          </div>
          <nav className="pagination" aria-label="Paginação">
            <Link aria-disabled={page === 1} href={page > 1 ? pageUrl(page - 1) : pageUrl(1)}><ChevronLeft size={15} /> Anterior</Link>
            <span>Página {Math.min(page, totalPages)} de {totalPages}</span>
            <Link aria-disabled={page >= totalPages} href={page < totalPages ? pageUrl(page + 1) : pageUrl(totalPages)}>Próxima <ChevronRight size={15} /></Link>
          </nav>
        </section>

        {(session.permissions.has("unit.view") || session.permissions.has("category.view")) && (
          <details className="content-card catalog-card advanced-section">
            <summary>Ajustes opcionais de unidades e categorias</summary>
            <p className="advanced-copy">Use esta área só quando precisar de unidades diferentes, como caixa, quilo ou litro.</p>
            <div className="catalog-config-grid">
              {session.permissions.has("unit.view") && (
                <section>
                  <div className="card-heading">
                    <div><span className="eyebrow"><Ruler size={14} /> Unidades</span><h3>{units.length} cadastrada{units.length === 1 ? "" : "s"}</h3></div>
                  </div>
                  {session.permissions.has("unit.create") && <UnitForm />}
                  <div className="maintenance-list">{units.map((unit) => <UnitMaintenance unit={unit} key={unit.id} />)}</div>
                </section>
              )}
              {session.permissions.has("category.view") && (
                <section>
                  <div className="card-heading">
                    <div><span className="eyebrow"><Layers3 size={14} /> Categorias</span><h3>{categories.length} cadastrada{categories.length === 1 ? "" : "s"}</h3></div>
                  </div>
                  {session.permissions.has("category.create") && <CategoryForm />}
                  <div className="maintenance-list">{categories.map((category) => <CategoryMaintenance category={category} key={category.id} />)}</div>
                </section>
              )}
            </div>
          </details>
        )}
      </main>
    </>
  );
}
