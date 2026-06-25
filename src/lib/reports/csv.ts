export type CsvValue = string | number | boolean | Date | null | undefined;

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => CsvValue;
};

function stringifyCsvValue(value: CsvValue) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function escapeCsvValue(value: CsvValue, delimiter = ";") {
  const text = stringifyCsvValue(value);
  const escaped = text.replace(/"/g, '""');
  return escaped.includes('"') || escaped.includes("\n") || escaped.includes("\r") || escaped.includes(delimiter)
    ? `"${escaped}"`
    : escaped;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[], delimiter = ";") {
  const lines = [
    columns.map((column) => escapeCsvValue(column.header, delimiter)).join(delimiter),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row), delimiter)).join(delimiter)),
  ];

  return lines.join("\r\n");
}
