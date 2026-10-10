// Lab 4.5 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.5A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.5 · หาวันที่ยอดขายผิดปกติ
// เทียบกับ "ค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน" ไม่ใช่ค่าเฉลี่ย 28 วัน
// เพราะสาขาออฟฟิศกับห้างขายวันธรรมดาและเสาร์-อาทิตย์ต่างกันมาก
import { addDays } from "../../lab3/time.js";

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/**
 * คะแนนความผิดปกติ = ln((จริง + SMOOTH) / (คาดหวัง + SMOOTH))
 * SMOOTH กันไม่ให้วันยอดน้อย ๆ (เช่น 50 บาท เทียบ 100 บาท) ดูผิดปกติเกินจริง
 * @param daily    [{ date, branch, revenue }] จาก dailyByBranch()
 * @param holidays { "YYYY-MM-DD": "ชื่อวันหยุด" } วันหยุดจะไม่ถูกจัดอันดับ แต่ติดป้ายไว้
 * @returns ทุกวันที่คำนวณได้ เรียงจากผิดปกติมากไปน้อย:
 *   { date, branch, actual, expected, change (สัดส่วน เช่น -0.9 = ต่ำกว่าปกติ 90%), score, holiday }
 */
export function scoreAnomalies(daily, holidays = {}, { weeks = 8, minWeeks = 4, smooth = 1000 } = {}) {
  // ยอดรายวันแยกสาขา: Map(สาขา → Map(วันที่ → ยอด)) และช่วงวันที่ของแต่ละสาขา
  const byBranch = new Map();
  for (const d of daily) {
    let b = byBranch.get(d.branch);
    if (!b) byBranch.set(d.branch, (b = { sums: new Map(), first: d.date, last: d.date }));
    b.sums.set(d.date, (b.sums.get(d.date) ?? 0) + d.revenue);
    if (d.date < b.first) b.first = d.date;
    if (d.date > b.last) b.last = d.date;
  }

  const out = [];
  for (const [branch, { sums, first, last }] of byBranch) {
    // วันที่ไม่มีแถวในช่วงที่สาขาเปิด = ขายไม่ได้เลย (เช่น ไฟดับทั้งวัน) จึงนับเป็น 0
    const revenueOn = (date) => sums.get(date) ?? 0;
    for (let date = first; date <= last; date = addDays(date, 1)) {
      // วันเดียวกันของสัปดาห์ย้อนหลัง 1..weeks สัปดาห์ เฉพาะที่อยู่ในช่วงที่สาขาเปิดแล้ว
      const past = [];
      for (let k = 1; k <= weeks; k++) {
        const prev = addDays(date, -7 * k);
        if (prev < first) break;
        past.push(revenueOn(prev));
      }
      if (past.length < minWeeks) continue;
      const actual = revenueOn(date);
      const expected = median(past);
      out.push({
        date, branch, actual, expected,
        change: expected ? actual / expected - 1 : null,
        score: Math.log((actual + smooth) / (expected + smooth)),
        holiday: holidays[date] ?? null,
      });
    }
  }
  return out.sort((x, y) => Math.abs(y.score) - Math.abs(x.score) || x.date.localeCompare(y.date) || x.branch.localeCompare(y.branch));
}

/** อันดับวันผิดปกติที่ควรตรวจสอบ (ไม่รวมวันหยุด) */
export function topAnomalies(daily, holidays = {}, n = 15, opts) {
  return scoreAnomalies(daily, holidays, opts).filter((a) => !a.holiday).slice(0, n);
}
