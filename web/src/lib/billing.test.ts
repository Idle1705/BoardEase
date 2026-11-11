import { describe, expect, it } from "vitest";
import {
  allocateCharges,
  applyPayment,
  billBalance,
  billStatus,
  billTotal,
  billingMonth,
  contactNumber,
  generateBills,
  isoDate,
  splitCents,
  statement,
  summary,
  toCents,
  validateCapacity,
  type Bill,
} from "./billing";

// The desktop app's reference case (tests/test_workflow.py setUp):
// SingleRoom('101', 3500) + UtilityReading(10 kWh at 12, 2 cu.m at 30) => 3680.00
const reading = { month: "2026-10", electricityKwh: 10, waterCubicM: 2, electricityRatePerKwh: 12, waterRatePerCubicM: 30 };
const makeBill = (over: Partial<Bill> = {}): Bill => ({
  id: "b1",
  month: "2026-10",
  rent: 350000,
  electricity: 12000,
  water: 6000,
  dueDate: "2099-10-31",
  paid: 0,
  ...over,
});

describe("money", () => {
  it("rounds half-up to centavos like Decimal ROUND_HALF_UP", () => {
    expect(toCents(3680)).toBe(368000);
    expect(toCents("12.345")).toBe(1235);
    expect(toCents(2.675)).toBe(268);
    expect(toCents(0)).toBe(0);
  });
  it("rejects negative, empty and non-finite amounts", () => {
    for (const v of [-1, Number.NaN, Number.POSITIVE_INFINITY, "", "abc"]) expect(() => toCents(v as number)).toThrow();
  });
});

describe("validation", () => {
  it("accepts only exact YYYY-MM-DD dates and YYYY-MM months", () => {
    expect(isoDate("2026-10-31")).toBe("2026-10-31");
    for (const d of ["2026/10/31", "2026-02-30", "31-10-2026", "not-a-date"]) expect(() => isoDate(d)).toThrow();
    expect(billingMonth("2026-10")).toBe("2026-10");
    for (const m of ["2026-13", "2026-1", "10-2026", "2026/10"]) expect(() => billingMonth(m)).toThrow();
  });
  it("needs an 11-digit contact number", () => {
    expect(contactNumber(" 09171234567 ")).toBe("09171234567");
    for (const c of ["0917123456", "091712345678", "0917-123-4567", "abcdefghijk"]) expect(() => contactNumber(c)).toThrow();
  });
  it("keeps single rooms at 1 and shared rooms at 2 or 3", () => {
    expect(() => validateCapacity("single", 1)).not.toThrow();
    expect(() => validateCapacity("shared", 2)).not.toThrow();
    expect(() => validateCapacity("shared", 3)).not.toThrow();
    for (const c of [1, 4, 6]) expect(() => validateCapacity("shared", c)).toThrow();
    expect(() => validateCapacity("single", 2)).toThrow();
  });
});

describe("splitting a room's charges", () => {
  it("bills the reference single room 3680.00", () => {
    const [a] = allocateCharges(toCents(3500), reading, 1);
    expect(a).toEqual({ rent: 350000, electricity: 12000, water: 6000 });
  });
  it("gives the extra centavo to the first tenants so shares add up exactly", () => {
    expect(splitCents(1000, 3)).toEqual([334, 333, 333]);
    const shares = allocateCharges(100001, { ...reading, electricityKwh: 1, electricityRatePerKwh: 0.01 }, 3);
    expect(shares.reduce((s, x) => s + x.rent, 0)).toBe(100001);
    expect(shares.map((s) => s.electricity)).toEqual([1, 0, 0]);
  });
  it("refuses an empty room", () => {
    expect(() => allocateCharges(100, reading, 0)).toThrow();
  });
  it("refuses a second set of bills for the same month", () => {
    const bills = generateBills(350000, ["t1"], reading, "2099-10-31", []);
    expect(bills[0].month).toBe("2026-10");
    expect(() => generateBills(350000, ["t1"], reading, "2099-10-31", [{ tenantId: "t1", month: "2026-10" }])).toThrow(/already exist/);
  });
});

describe("payments", () => {
  it("tracks a partial payment, then settles it (test_partial_payment_is_not_paid...)", () => {
    const first = applyPayment(makeBill(), 1000, "2026-10-02");
    expect(first.remaining).toBe(268000);
    expect(billStatus(first.bill, "2026-10-05")).toBe("PARTIAL");
    const second = applyPayment(first.bill, 2680, "2026-10-03");
    expect(second.remaining).toBe(0);
    expect(billStatus(second.bill, "2026-10-05")).toBe("PAID");
    expect(billTotal(second.bill)).toBe(368000);
  });
  it("rejects zero, negative, too-large and badly dated payments", () => {
    const bill = makeBill();
    for (const amount of [0, -5, 3680.01]) expect(() => applyPayment(bill, amount, "2026-10-02")).toThrow();
    expect(() => applyPayment(bill, 100, "not-a-date")).toThrow();
    expect(bill.paid).toBe(0);
  });
  it("marks a bill overdue after its due date until it is fully paid", () => {
    const part = applyPayment(makeBill(), 100, "2026-10-02").bill;
    expect(billStatus(part, "2099-11-01")).toBe("OVERDUE");
    const done = applyPayment(part, billBalance(part) / 100, "2026-10-03").bill;
    expect(billStatus(done, "2099-11-01")).toBe("PAID");
  });
});

describe("statements and summary", () => {
  it("carries unpaid earlier months into the total due", () => {
    const sept = makeBill({ id: "s", month: "2026-09", dueDate: "2026-09-30", paid: 100000 });
    const oct = makeBill({ id: "o" });
    const s = statement(oct, [sept], "2026-10-05");
    expect(s.previousBalance).toBe(268000);
    expect(s.totalDue).toBe(368000 + 268000);
    expect(s.status).toBe("OVERDUE");
  });
  it("counts paid, partial and overdue bills", () => {
    const bills = [makeBill({ paid: 368000 }), makeBill({ id: "2", paid: 1000 }), makeBill({ id: "3", dueDate: "2026-01-31" })];
    expect(summary(bills, "2026-10-05")).toMatchObject({ bills: 3, paid: 1, unpaid: 2, partial: 1, overdue: 1, totalPaid: 369000 });
  });
});
