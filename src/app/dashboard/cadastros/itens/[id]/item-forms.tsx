"use client";

import { useActionState } from "react";
import {
  createUnitConversionAction,
  inactivateBomComponentAction,
  saveBomComponentAction,
  toggleItemAction,
  toggleUnitConversionAction,
  updateItemAction,
  type CatalogActionState,
} from "../../actions";

const initialState: CatalogActionState = {};

function Feedback({ state }: { state: CatalogActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

type ItemEditProps = {
  item: {
    id: string;
    name: string;
    type: string;
    unitId: string;
    categoryId: string | null;
    sku: string | null;
    barcode: string | null;
    minimumStock: string;
    description: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
  units: { id: string; name: string; symbol: string }[];
  categories: { id: string; name: string }[];
};

export function ItemEditForm({ item, units, categories }: ItemEditProps) {
  const [state, action, pending] = useActionState(updateItemAction, initialState);
  const [statusState, statusAction, toggling] = useActionState(toggleItemAction, initialState);

  return (
    <>
      <form action={action} className="item-form">
        <input type="hidden" name="id" value={item.id} />
        <div className="form-row three-columns">
          <label>Nome<input name="name" defaultValue={item.name} required /></label>
          <label>Tipo<select name="type" defaultValue={item.type}><option value="RAW_MATERIAL">Materia-prima</option><option value="PACKAGING">Embalagem</option><option value="COMPONENT">Componente</option><option value="INTERMEDIATE">Intermediario</option><option value="FINISHED_PRODUCT">Produto acabado</option><option value="RESALE">Revenda</option><option value="INTERNAL_CONSUMPTION">Consumo interno</option></select></label>
          <label>Unidade principal<select name="unitId" defaultValue={item.unitId}>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></label>
        </div>
        <div className="form-row four-columns">
          <label>Categoria<select name="categoryId" defaultValue={item.categoryId ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          <label>SKU<input name="sku" defaultValue={item.sku ?? ""} /></label>
          <label>Codigo de barras<input name="barcode" defaultValue={item.barcode ?? ""} /></label>
          <label>Estoque minimo<input name="minimumStock" defaultValue={item.minimumStock} /></label>
        </div>
        <label>Descricao<textarea name="description" rows={3} defaultValue={item.description ?? ""} /></label>
        <Feedback state={state} />
        <button className="primary-button form-submit" disabled={pending}>{pending ? "Salvando..." : "Salvar alteracoes"}</button>
      </form>
      <form action={statusAction} className="danger-zone">
        <input type="hidden" name="id" value={item.id} />
        <div><strong>{item.status === "ACTIVE" ? "Inativar item" : "Reativar item"}</strong><p>{item.status === "ACTIVE" ? "O item permanece no historico, mas deixa de aceitar operacoes comuns." : "O item volta a ficar disponivel para novas operacoes."}</p></div>
        <button className="secondary-button" disabled={toggling}>{toggling ? "Aguarde..." : item.status === "ACTIVE" ? "Inativar" : "Ativar"}</button>
        <Feedback state={statusState} />
      </form>
    </>
  );
}

export function ConversionForm({ itemId, stockSymbol, units }: { itemId: string; stockSymbol: string; units: { id: string; name: string; symbol: string }[] }) {
  const [state, action, pending] = useActionState(createUnitConversionAction, initialState);
  return <form action={action} className="compact-form conversion-form"><input type="hidden" name="itemId" value={itemId} /><label>Unidade alternativa<select name="sourceUnitId" defaultValue=""><option value="" disabled>Selecione</option>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></label><label>Fator para a unidade de estoque<input name="factorToStockUnit" inputMode="decimal" placeholder="Ex.: 24" /><small>1 unidade alternativa = fator x {stockSymbol}</small></label><Feedback state={state} /><button className="secondary-button" disabled={pending}>{pending ? "Salvando..." : "Adicionar conversao"}</button></form>;
}

export function ConversionStatusForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(toggleUnitConversionAction, initialState);
  return <form action={action} className="inline-status-form"><input type="hidden" name="id" value={id} /><button className="text-button" disabled={pending}>{pending ? "Aguarde..." : active ? "Inativar" : "Ativar"}</button><Feedback state={state} /></form>;
}

export function BomComponentForm({ productId, items }: { productId: string; items: { id: string; name: string; unit: string }[] }) {
  const [state, action, pending] = useActionState(saveBomComponentAction, initialState);
  return (
    <form action={action} className="item-form">
      <input type="hidden" name="productId" value={productId} />
      <div className="form-row">
        <label>Componente<select name="componentItemId" defaultValue="" required><option value="" disabled>Selecione</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select></label>
        <label>Qtd. por unidade produzida<input name="quantity" inputMode="decimal" placeholder="Ex.: 2" required /></label>
      </div>
      <Feedback state={state} />
      <button className="secondary-button form-submit" disabled={pending}>{pending ? "Salvando..." : "Salvar componente"}</button>
    </form>
  );
}

export function BomComponentStatusForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(inactivateBomComponentAction, initialState);
  return <form action={action} className="inline-status-form"><input type="hidden" name="id" value={id} /><button className="text-button" disabled={pending}>{pending ? "Aguarde..." : "Remover"}</button><Feedback state={state} /></form>;
}
