/*
 * Billing rules ported from the BoardEase desktop app (src/bill.py, src/utility_reading.py,
 * src/boarding_house.py). Money is held in whole centavos so splits never drift.
 * Behaviour is pinned by src/lib/billing.test.ts, which mirrors tests/test_workflow.py.
 */

export type Cents = number;

export class BillingError extends Error {}

/** Python `money()`: finite, non-negative, rounded half-up to centavos. */
export function toCents(value: number | string): Cents {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || (typeof value === "string" && value.trim() === "")) {
    throw new BillingError("Enter a finite, non-negative amount.");
  }
  // Round half-up on the decimal string, not the binary float (2.675 -> 268, as Decimal does)
  const [whole, frac = ""] = n.toFixed(10).split(".");
  const cents = Number(whole) * 100 + Number(frac.slice(0, 2).padEnd(2, "0"));
  return frac.charCodeAt(2) - 48 >= 5 ? cents + 1 : cents;
}

export function isoDate(value: string): string {
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new BillingError("Enter a valid date in YYYY-MM-DD format, for example 2026-10-31.");
  const d = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text) {
    throw new BillingError("Enter a valid date in YYYY-MM-DD format, for example 2026-10-31.");
  }
  return text;
}

export function billingMonth(value: string): string {
  const text = String(value).trim();
  const m = /^(\d{4})-(\d{2})$/.exec(text);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
    throw new BillingError("Enter the billing month as YYYY-MM, for example 2026-10.");
  }
  return text;
}

/** Philippine mobile numbers as the desktop app stores them: exactly 11 digits. */
export function contactNumber(value: string): string {
  const text = String(value).trim();
  if (!/^\d{11}$/.test(text)) throw new BillingError("Contact number must be exactly 11 digits, for example 09171234567.");
  return text;
}

/** Split whole centavos across n people; the first `remainder` people pay one centavo more. */
export function splitCents(total: Cents, count: number): Cents[] {
  if (!Number.isInteger(count) || count < 1) throw new BillingError("The room must have tenants before billing.");
  const share = Math.floor(total / count);
  const remainder = total - share * count;
  return Array.from({ length: count }, (_, i) => share + (i < remainder ? 1 : 0));
}

export type UtilityReading = {
  month: string;
  electricityKwh: number;
  waterCubicM: number;
  electricityRatePerKwh: number;
  waterRatePerCubicM: number;
};

export type Allocation = { rent: Cents; electricity: Cents; water: Cents };

/** One room's monthly charges divided fairly between its current tenants. */
export function allocateCharges(baseRent: Cents, reading: UtilityReading, tenantCount: number): Allocation[] {
  for (const v of [reading.electricityKwh, reading.waterCubicM, reading.electricityRatePerKwh, reading.waterRatePerCubicM]) {
    toCents(v);
  }
  const rent = splitCents(baseRent, tenantCount);
  const electricity = splitCents(toCents(reading.electricityKwh * reading.electricityRatePerKwh), tenantCount);
  const water = splitCents(toCents(reading.waterCubicM * reading.waterRatePerCubicM), tenantCount);
  return rent.map((r, i) => ({ rent: r, electricity: electricity[i], water: water[i] }));
}

export type BillStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";

export type Bill = {
  id: string;
  month: string;
  rent: Cents;
  electricity: Cents;
  water: Cents;
  dueDate: string;
  paid: Cents;
};

export const billTotal = (b: Bill): Cents => b.rent + b.electricity + b.water;
export const billBalance = (b: Bill): Cents => Math.max(0, billTotal(b) - b.paid);
export const isPaid = (b: Bill) => b.paid >= billTotal(b);

export function billStatus(b: Bill, today: string): BillStatus {
  if (isPaid(b)) return "PAID";
  if (b.dueDate < isoDate(today)) return "OVERDUE";
  return b.paid > 0 ? "PARTIAL" : "UNPAID";
}

/** Returns the bill with the payment applied; throws without changing anything when invalid. */
export function applyPayment(b: Bill, amount: number, datePaid: string): { bill: Bill; remaining: Cents } {
  const cents = toCents(amount);
  if (cents <= 0) throw new BillingError("Payment must be at least 0.01.");
  if (cents > billBalance(b)) throw new BillingError("Payment cannot exceed the remaining balance.");
  isoDate(datePaid);
  const bill = { ...b, paid: b.paid + cents };
  return { bill, remaining: billBalance(bill) };
}

export function generateBills(
  baseRent: Cents,
  tenantIds: string[],
  reading: UtilityReading,
  dueDate: string,
  existing: { tenantId: string; month: string }[],
): (Omit<Bill, "id" | "paid"> & { tenantId: string })[] {
  if (!tenantIds.length) throw new BillingError("Select an occupied room.");
  const month = billingMonth(reading.month);
  const due = isoDate(dueDate);
  if (existing.some((e) => tenantIds.includes(e.tenantId) && e.month.slice(0, 7) === month)) {
    throw new BillingError("Bills already exist for a tenant in this room for that month.");
  }
  return allocateCharges(baseRent, reading, tenantIds.length).map((a, i) => ({
    tenantId: tenantIds[i],
    month,
    rent: a.rent,
    electricity: a.electricity,
    water: a.water,
    dueDate: due,
  }));
}

export type Statement = { bill: Bill; previousBalance: Cents; totalDue: Cents; status: BillStatus };

/** A month's statement carries forward unpaid balances from earlier months. */
export function statement(bill: Bill, earlierBills: Bill[], today: string): Statement {
  const previous = earlierBills.filter((b) => b.month < bill.month && billBalance(b) > 0);
  const previousBalance = previous.reduce((s, b) => s + billBalance(b), 0);
  const totalDue = billBalance(bill) + previousBalance;
  const all = [bill, ...previous];
  let status: BillStatus;
  if (totalDue === 0) status = "PAID";
  else if (all.some((b) => billStatus(b, today) === "OVERDUE")) status = "OVERDUE";
  else status = all.some((b) => b.paid > 0) ? "PARTIAL" : "UNPAID";
  return { bill, previousBalance, totalDue, status };
}

export function summary(bills: Bill[], today: string) {
  return {
    totalBilled: bills.reduce((s, b) => s + billTotal(b), 0),
    totalPaid: bills.reduce((s, b) => s + b.paid, 0),
    balance: bills.reduce((s, b) => s + billBalance(b), 0),
    bills: bills.length,
    paid: bills.filter(isPaid).length,
    unpaid: bills.filter((b) => !isPaid(b)).length,
    partial: bills.filter((b) => b.paid > 0 && !isPaid(b)).length,
    overdue: bills.filter((b) => billStatus(b, today) === "OVERDUE").length,
  };
}

/** Shared rooms in the desktop app hold two or three tenants; single rooms hold one. */
export function validateCapacity(kind: "single" | "shared", capacity: number) {
  if (kind === "single" && capacity !== 1) throw new BillingError("A single room has capacity 1.");
  if (kind === "shared" && capacity !== 2 && capacity !== 3) throw new BillingError("A shared room holds 2 or 3 tenants.");
}
