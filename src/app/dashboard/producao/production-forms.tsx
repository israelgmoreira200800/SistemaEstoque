"use client";

import { useMemo, useState, useActionState } from "react";
import { finishProductionAction, type ProductionActionState } from "./actions";

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
  const missing = requirements.filter((component) => component.balance < component.required);

  return (
    <form action={action} className="item-form">
      <div className="form-row">
        <label>Produto<select name="productId" value={productId} onChange={(event) => setProductId(event.target.value)} required><option value="" disabled>Selecione</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
        <label>Quantidade produzida<input name="quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" required /></label>
      </div>
      <div className="form-row three-columns">
        <label>Perdas<input name="lossQuantity" inputMode="decimal" placeholder="0" /></label>
        <label>Lote<input name="lotNumber" placeholder="Opcional" /></label>
        <label>Observacao<input name="note" placeholder="Opcional" /></label>
      </div>
      <div className="requirement-box">
        <strong>Componentes necessarios</strong>
        {requirements.length === 0 ? <p>Nenhum componente cadastrado para este produto.</p> : requirements.map((component) => (
          <p key={component.itemId}>
            {component.name}: {formatQuantity(component.required)} {component.unit}
            <small> disponivel: {formatQuantity(component.balance)} {component.unit}</small>
          </p>
        ))}
        {missing.length > 0 && (
          <div className="catalog-feedback catalog-error" role="alert">
            <strong>Estoque insuficiente</strong>
            {missing.map((component) => (
              <p key={component.itemId}>{component.name}: necessario {formatQuantity(component.required)}, disponivel {formatQuantity(component.balance)}</p>
            ))}
          </div>
        )}
      </div>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending || !selected || requirements.length === 0 || missing.length > 0}>{pending ? "Registrando..." : "Confirmar producao"}</button>
    </form>
  );
}
