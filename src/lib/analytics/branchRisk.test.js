import { describe, it, expect } from "vitest";
import { branchRisk, weeklyCv } from "./branchRisk.js";
import { addDays } from "../../lab3/time.js";

// สร้างยอดรายวันคงที่ต่อสาขา: perDay ต่างกันระหว่างปี 2025 กับ 2026
const make = (branch, from, to, per2025, per2026) => {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, branch, revenue: d < "2026-01-01" ? per2025 : per2026 });
  return out;
};
const daily = [
  ...make("A", "2025-01-01", "2026-06-30", 1000, 1300), // ขายดี โต 30%
  ...make("B", "2025-01-01", "2026-06-30", 500, 520),   // ขายน้อย โตช้า → เสี่ยงสุด
  ...make("C", "2025-01-01", "2026-06-30", 800, 960),   // กลาง ๆ
  ...make("N", "2025-12-01", "2026-06-30", 700, 900),   // สาขาใหม่
];

describe("weeklyCv", () => {
  it("ยอดคงที่ทุกสัปดาห์ = 0", () => {
    expect(weeklyCv(make("A", "2026-01-05", "2026-02-01", 100, 100))).toBe(0);
  });
});

describe("branchRisk", () => {
  const r = branchRisk(daily);
  it("ปีก่อน/ปีนี้มาจากวันสุดท้ายของข้อมูล", () => {
    expect([r.prevYear, r.curYear, r.curTo]).toEqual([2025, 2026, "2026-06-30"]);
  });
  it("ยอดต่อวันและการเติบโตคำนวณแยกปี", () => {
    const a = r.branches.find((b) => b.branch === "A");
    expect([a.prevPerDay, a.curPerDay]).toEqual([1000, 1300]);
    expect(a.growth).toBeCloseTo(0.3);
  });
  it("เรียงจากเสี่ยงสูงไปต่ำ สาขาใหม่อยู่ท้ายและไม่จัดอันดับ", () => {
    expect(r.branches.map((b) => b.branch)).toEqual(["B", "C", "A", "N"]);
    expect(r.branches.at(-1)).toMatchObject({ isNew: true, rank: null, risk: "ยังประเมินไม่ได้" });
  });
  it("เลื่อนวันที่กลับด้วย shift ให้ขอบปีตรงปฏิทินจริง", () => {
    const shifted = daily.map((d) => ({ ...d, date: addDays(d.date, 14) }));
    expect(branchRisk(shifted, 14).branches.find((b) => b.branch === "A").curPerDay).toBe(1300);
  });
});
