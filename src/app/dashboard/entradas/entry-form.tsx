"use client";

import { useActionState } from "react";
import { createEntryAction, type StockActionState } from "./actions";

const initialState: StockActionState = {};

function Feedback({ state }: { state: StockActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function EntryForm({ items }: { items: { id: string; name: string; unit: string }[] }) {
  const [state, action, pending] = useActionState(createEntryAction, initialState);
  return (
    <form action={action} className="item-form">
      <div className="form-row three-columns">
        <label>Item<select name="itemId" defaultValue="" required><option value="" disabled>Selecione</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select></label>
        <label>Quantidade<input name="quantity" inputMode="decimal" placeholder="Ex.: 10" required /></label>
        <label>Documento<input name="documentNumber" placeholder="NF, pedido ou referência" /></label>
      </div>
      <label>Observação<textarea name="note" rows={2} placeholder="Opcional" /></label>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending || items.length === 0}>{pending ? "Registrando…" : "Registrar entrada"}</button>
    </form>
  );
}

