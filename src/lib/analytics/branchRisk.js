// Lab 4.4B (ขยายเอง) · สรุปยอดรายปีของแต่ละสาขา และจัดอันดับความเสี่ยงสำหรับปีถัดไป
// ใช้ยอดรายวันแยกสาขา (analytics/daily) ไม่มีต้นทุนคงที่ (ค่าเช่า ค่าพนักงาน) จึงบอกได้แค่ "สาขาที่อ่อนที่สุด" ไม่ใช่ "สาขาที่ขาดทุน"
import { addDays } from "../../lab3/time.js";
import { toSeries } from "./daily.js";

const dow = (ymd) => new Date(ymd + "T00:00:00Z").getUTCDay(); // 0 = อาทิตย์
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/** ส่วนเบี่ยงเบนมาตรฐาน / ค่าเฉลี่ย ของยอดรายสัปดาห์ (จันทร์–อาทิตย์ เฉพาะสัปดาห์ที่ครบ 7 วัน) */
export function weeklyCv(series) {
  const weeks = [];
  for (let i = series.findIndex((s) => dow(s.date) === 1); i >= 0 && i + 7 <= series.length; i += 7) {
    weeks.push(sum(series.slice(i, i + 7).map((s) => s.revenue)));
  }
  if (weeks.length < 2) return 0;
  const mean = sum(weeks) / weeks.length;
  return mean ? Math.sqrt(sum(weeks.map((w) => (w - mean) ** 2)) / weeks.length) / mean : 0;
}

/**
 * @param daily  [{ date, branch, revenue }] จาก analytics/daily
 * @param shift  จำนวนวันที่ pipeline เลื่อนวันที่ไปข้างหน้า (meta.shift) · เลื่อนกลับเพื่อให้ขอบปีตรงกับปฏิทินจริง
 * @returns {{ prevYear, curYear, prevFrom, prevTo, curTo, branches: object[] }}
 *   branches เรียงตามความเสี่ยงจากสูงไปต่ำ สาขาที่เปิดไม่ถึง 1 ปี (isNew) อยู่ท้ายและไม่จัดอันดับ
 */
export function branchRisk(daily, shift = 0) {
  const rows = shift ? daily.map((d) => ({ ...d, date: addDays(d.date, -shift) })) : daily;
  const asOf = rows.reduce((m, d) => (d.date > m ? d.date : m), "");
  const curYear = Number(asOf.slice(0, 4));
  const prevYear = curYear - 1;
  const inYear = (s, y) => s.filter((x) => x.date.startsWith(String(y)));
  const names = [...new Set(rows.map((d) => d.branch))];

  const all = names.map((branch) => {
    const series = toSeries(rows, branch, asOf);
    const prev = inYear(series, prevYear);
    const cur = inYear(series, curYear);
    const prevRevenue = sum(prev.map((s) => s.revenue));
    const prevPerDay = prev.length ? prevRevenue / prev.length : 0;
    const curPerDay = cur.length ? sum(cur.map((s) => s.revenue)) / cur.length : 0;
    return {
      branch,
      firstDate: series[0].date,
      isNew: series[0].date > addDays(asOf, -365),
      prevDays: prev.length,
      prevRevenue,
      prevPerDay,
      curPerDay,
      growth: prevPerDay ? curPerDay / prevPerDay - 1 : null,
      weeklyCv: weeklyCv(cur),
    };
  });
  const prevTotal = sum(all.map((b) => b.prevRevenue));
  for (const b of all) b.prevShare = prevTotal ? b.prevRevenue / prevTotal : 0;

  // ให้คะแนนเฉพาะสาขาที่เปิดครบปี: แต่ละตัวชี้วัดเรียงอันดับ 1..n (n = เสี่ยงที่สุด) แล้วรวมกัน
  const rated = all.filter((b) => !b.isNew);
  const rankBy = (key, riskyWhenLow) => {
    const order = [...rated].sort((a, b) => (riskyWhenLow ? b[key] - a[key] : a[key] - b[key]));
    order.forEach((b, i) => { b.points = (b.points ?? 0) + i + 1; });
  };
  rankBy("curPerDay", true);  // ยอดต่อวันต่ำ = เสี่ยง
  rankBy("growth", true);     // โตช้า = เสี่ยง
  rankBy("weeklyCv", false);  // ยอดแกว่งมาก = เสี่ยง
  rated.sort((a, b) => b.points - a.points || a.curPerDay - b.curPerDay); // คะแนนเท่ากัน: ยอดต่อวันต่ำกว่าเสี่ยงกว่า

  const extreme = (key, pick) => pick(...rated.map((b) => b[key]));
  const top = extreme("curPerDay", Math.max);
  rated.forEach((b, i) => {
    b.rank = i + 1;
    b.risk = i === 0 ? "สูง" : i === 1 ? "ค่อนข้างสูง" : i === rated.length - 1 ? "ต่ำสุด" : "ต่ำ";
    const risks = [], strengths = [];
    if (b.curPerDay === extreme("curPerDay", Math.min)) risks.push(`ยอดต่อวันต่ำสุด (${Math.round((b.curPerDay / top) * 100)}% ของสาขาที่ขายดีสุด)`);
    if (b.growth === extreme("growth", Math.min)) risks.push("โตช้าที่สุด");
    if (b.weeklyCv === extreme("weeklyCv", Math.max)) risks.push("ยอดแกว่งมากที่สุด");
    if (b.growth !== null && b.growth < 0) risks.push("ยอดต่อวันลดลงจากปีก่อน");
    if (b.curPerDay === top) strengths.push("ยอดต่อวันสูงสุด");
    if (b.growth === extreme("growth", Math.max)) strengths.push("โตเร็วที่สุด");
    if (b.weeklyCv === extreme("weeklyCv", Math.min)) strengths.push("ยอดนิ่งที่สุด");
    b.risks = risks;
    b.strengths = strengths;
  });
  const fresh = all.filter((b) => b.isNew).map((b) => ({
    ...b, rank: null, risk: "ยังประเมินไม่ได้", risks: [], strengths: [],
  }));

  const prevDates = rows.map((d) => d.date).filter((d) => d.startsWith(String(prevYear))).sort();
  return {
    prevYear, curYear,
    prevFrom: prevDates[0] ?? null, prevTo: prevDates.at(-1) ?? null, curTo: asOf,
    branches: [...rated, ...fresh],
  };
}
