"use client";

import { useMemo, useState, useActionState } from "react";
import { finishProductionAction, inactivateComponentAction, saveComponentAction, type ProductionActionState } from "./actions";

const initialState: ProductionActionState = {};

type Product = {
  id: string;
  name: string;
  unit: string;
  components: { itemId: string; name: string; unit: string; quantity: number; balance: number }[];
};

function Feedback({ state }: { state: ProductionActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(value);
}

export function ComponentForm({ products, items }: { products: { id: string; name: string }[]; items: { id: string; name: string; unit: string }[] }) {
  const [state, action, pending] = useActionState(saveComponentAction, initialState);
  return (
    <form action={action} className="item-form">
      <div className="form-row three-columns">
        <label>Produto<select name="productId" defaultValue="" required><option value="" disabled>Selecione</option>{products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Componente<select name="componentItemId" defaultValue="" required><option value="" disabled>Selecione</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select></label>
        <label>Qtd. por unidade produzida<input name="quantity" inputMode="decimal" placeholder="Ex.: 2" required /></label>
      </div>
      <Feedback state={state} />
      <button className="secondary-button form-submit" disabled={pending}>{pending ? "Salvando…" : "Salvar componente"}</button>
    </form>
  );
}

export function ProductionForm({ products }: { products: Product[] }) {
  const [state, action, pending] = useActionState(finishProductionAction, initialState);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const selected = products.find((product) => product.id === productId);
  const amount = Number(quantity.replace(",", ".")) || 0;
  const requirements = useMemo(
    () => selected?.components.map((component) => ({ ...component, required: component.quantity * amount })) ?? [],
    [selected, amount],
  );

  return (
    <form action={action} className="item-form">
      <div className="form-row">
        <label>Produto<select name="productId" value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="" disabled>Selecione</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
        <label>Quantidade produzida<input name="quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" required /></label>
      </div>
      <div className="requirement-box">
        <strong>Componentes necessários</strong>
        {requirements.length === 0 ? <p>Nenhum componente cadastrado para este produto.</p> : requirements.map((component) => (
          <p key={component.itemId}>
            {component.name}: {formatQuantity(component.required)} {component.unit}
            <small> disponível: {formatQuantity(component.balance)} {component.unit}</small>
          </p>
        ))}
      </div>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending || !selected || requirements.length === 0}>{pending ? "Registrando…" : "Confirmar produção"}</button>
    </form>
  );
}

export function ComponentStatusForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(inactivateComponentAction, initialState);
  return (
    <form action={action} className="inline-status-form">
      <input type="hidden" name="id" value={id} />
      <button className="text-button" disabled={pending}>{pending ? "Aguarde…" : "Remover"}</button>
      <Feedback state={state} />
    </form>
  );
}

