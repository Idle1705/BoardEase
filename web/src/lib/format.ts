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

const dateFmt = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** 12 Nov 2026, in Philippine time */
export function manilaDate(d: Date): string {
  return dateFmt.format(d);
}

/** 12 Nov, 3:05 pm, in Philippine time */
export function manilaDateTime(d: Date): string {
  return dateTimeFmt.format(d);
}
