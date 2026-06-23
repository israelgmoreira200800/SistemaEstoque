"use client";

import { useActionState } from "react";
import { createExitAction, type StockActionState } from "./actions";

const initialState: StockActionState = {};

function Feedback({ state }: { state: StockActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function ExitForm({ items }: { items: { id: string; name: string; unit: string; balance: string }[] }) {
  const [state, action, pending] = useActionState(createExitAction, initialState);
  return (
    <form action={action} className="item-form">
      <div className="form-row three-columns">
        <label>Item<select name="itemId" defaultValue="" required><option value="" disabled>Selecione</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.balance} {item.unit})</option>)}</select></label>
        <label>Quantidade<input name="quantity" inputMode="decimal" placeholder="Ex.: 2" required /></label>
        <label>Documento<input name="documentNumber" placeholder="Pedido, uso interno..." /></label>
      </div>
      <label>Motivo ou observação<textarea name="note" rows={2} placeholder="Opcional" /></label>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending || items.length === 0}>{pending ? "Registrando…" : "Registrar saída"}</button>
    </form>
  );
}

