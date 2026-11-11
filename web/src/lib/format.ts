const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const pesoCents = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₱4,500 */
export function formatPeso(amount: number): string {
  return peso.format(amount);
}

/** ₱4,500.00, for bills and payments */
export function formatPesoCents(cents: number): string {
  return pesoCents.format(cents / 100);
}

/** ₱4.5k, for compact map markers */
export function formatPesoShort(amount: number): string {
  if (amount < 1000) return `₱${amount}`;
  const k = amount / 1000;
  return `₱${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}
