import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvValue } from "./csv";

describe("escapeCsvValue", () => {
  it("escapa aspas e delimitador", () => {
    expect(escapeCsvValue('Pote "premium"; 120g')).toBe('"Pote ""premium""; 120g"');
  });

  it("mantem valores simples sem aspas", () => {
    expect(escapeCsvValue("Estoque")).toBe("Estoque");
    expect(escapeCsvValue(null)).toBe("");
  });
});

describe("buildCsv", () => {
  it("gera cabecalho e linhas com quebra CRLF", () => {
    const csv = buildCsv(
      [{ item: "Cafe", quantidade: "10,5" }],
      [
        { header: "Item", value: (row) => row.item },
        { header: "Quantidade", value: (row) => row.quantidade },
      ],
    );

    expect(csv).toBe("Item;Quantidade\r\nCafe;10,5");
  });
});
