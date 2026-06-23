"use client";

import { useActionState } from "react";
import { createCategoryAction, createItemAction, createUnitAction, toggleCategoryAction, toggleUnitAction, updateCategoryAction, updateUnitAction, type CatalogActionState } from "./actions";

const initialState: CatalogActionState = {};

function Feedback({ state }: { state: CatalogActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function UnitForm() {
  const [state, action, pending] = useActionState(createUnitAction, initialState);
  return <form action={action} className="compact-form"><div className="form-row"><label>Nome<input name="name" placeholder="Ex.: Unidade" required /></label><label>Símbolo<input name="symbol" placeholder="UN" required /></label></div><label className="check-field"><input type="checkbox" name="allowsFraction" /> Permitir quantidades fracionárias</label><Feedback state={state} /><button className="secondary-button" disabled={pending}>{pending ? "Salvando…" : "Adicionar unidade"}</button></form>;
}

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategoryAction, initialState);
  return <form action={action} className="compact-form"><label>Nome da categoria<input name="name" placeholder="Ex.: Embalagens" required /></label><Feedback state={state} /><button className="secondary-button" disabled={pending}>{pending ? "Salvando…" : "Adicionar categoria"}</button></form>;
}

type ItemFormProps = { units: { id: string; name: string; symbol: string }[]; categories: { id: string; name: string }[] };

export function ItemForm({ units, categories }: ItemFormProps) {
  const [state, action, pending] = useActionState(createItemAction, initialState);
  const disabled = units.length === 0;
  return <form action={action} className="item-form"><div className="form-row three-columns"><label>Nome<input name="name" placeholder="Ex.: Pote de 120 g" required /></label><label>Tipo<select name="type" defaultValue=""><option value="" disabled>Selecione</option><option value="RAW_MATERIAL">Matéria-prima</option><option value="PACKAGING">Embalagem</option><option value="COMPONENT">Componente</option><option value="INTERMEDIATE">Intermediário</option><option value="FINISHED_PRODUCT">Produto acabado</option><option value="RESALE">Revenda</option><option value="INTERNAL_CONSUMPTION">Consumo interno</option></select></label><label>Unidade<select name="unitId" defaultValue=""><option value="" disabled>Selecione</option>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></label></div><div className="form-row four-columns"><label>Categoria<select name="categoryId" defaultValue=""><option value="">Sem categoria</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>SKU<input name="sku" placeholder="PT-120" /></label><label>Código de barras<input name="barcode" inputMode="numeric" /></label><label>Estoque mínimo<input name="minimumStock" inputMode="decimal" defaultValue="0" /></label></div><label>Descrição<textarea name="description" rows={2} placeholder="Informações operacionais do item" /></label><Feedback state={state} /><button className="primary-button form-submit" disabled={pending || disabled}>{disabled ? "Cadastre uma unidade primeiro" : pending ? "Salvando item…" : "Cadastrar item"}</button></form>;
}

export function UnitMaintenance({ unit }: { unit: { id: string; name: string; symbol: string; allowsFraction: boolean; status: "ACTIVE" | "INACTIVE" } }) {
  const [updateState, updateAction, updating] = useActionState(updateUnitAction, initialState);
  const [statusState, statusAction, toggling] = useActionState(toggleUnitAction, initialState);
  return <article className="maintenance-row"><form action={updateAction} className="maintenance-edit"><input type="hidden" name="id" value={unit.id} /><input name="name" defaultValue={unit.name} aria-label="Nome da unidade" /><input name="symbol" defaultValue={unit.symbol} aria-label="Símbolo da unidade" /><label className="check-field"><input name="allowsFraction" type="checkbox" defaultChecked={unit.allowsFraction} /> Frações</label><button className="text-button" disabled={updating}>Salvar</button><Feedback state={updateState} /></form><form action={statusAction} className="inline-status-form"><input type="hidden" name="id" value={unit.id} /><span className={`status-badge ${unit.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{unit.status === "ACTIVE" ? "Ativa" : "Inativa"}</span><button className="text-button" disabled={toggling}>{unit.status === "ACTIVE" ? "Inativar" : "Ativar"}</button><Feedback state={statusState} /></form></article>;
}

export function CategoryMaintenance({ category }: { category: { id: string; name: string; status: "ACTIVE" | "INACTIVE" } }) {
  const [updateState, updateAction, updating] = useActionState(updateCategoryAction, initialState);
  const [statusState, statusAction, toggling] = useActionState(toggleCategoryAction, initialState);
  return <article className="maintenance-row"><form action={updateAction} className="maintenance-edit category-edit"><input type="hidden" name="id" value={category.id} /><input name="name" defaultValue={category.name} aria-label="Nome da categoria" /><button className="text-button" disabled={updating}>Salvar</button><Feedback state={updateState} /></form><form action={statusAction} className="inline-status-form"><input type="hidden" name="id" value={category.id} /><span className={`status-badge ${category.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{category.status === "ACTIVE" ? "Ativa" : "Inativa"}</span><button className="text-button" disabled={toggling}>{category.status === "ACTIVE" ? "Inativar" : "Ativar"}</button><Feedback state={statusState} /></form></article>;
}
