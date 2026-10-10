// Lab 4.4–4.5 · พยากรณ์และวันผิดปกติ
// คำนวณในเบราว์เซอร์จาก analytics/daily (ยอดรายวันแยกสาขา ~2,700 แถว) จึงเปลี่ยนสาขาได้ทันทีโดยไม่อ่าน Firestore เพิ่ม
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot,
} from "recharts";
import { AnalyticsShell, Card, Pending, Insight, MAIN, GREEN, MUTED, INK, thaiDay } from "./ui.jsx";
import { useAnalytics } from "./useAnalytics.js";
import { toSeries } from "../lib/analytics/daily.js";
import { seasonalForecast, backtest } from "../lib/analytics/forecast.js";
import { scoreAnomalies } from "../lib/analytics/anomaly.js";
import { branchRisk } from "../lib/analytics/branchRisk.js";
import { fmtBaht, fmtShortBaht } from "../lib/metrics.js";
import { addDays } from "../lab3/time.js";

const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];
const HORIZON = 28;
const shortDay = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const tryRun = (f) => { try { return { value: f() }; } catch (e) { return { error: e.message }; } };

function ForecastCard({ daily, abc }) {
  const [branch, setBranch] = useState(null);
  const result = useMemo(() => tryRun(() => {
    const series = toSeries(daily, branch);
    const bt = backtest(series, HORIZON);
    const fc = seasonalForecast(series, HORIZON);
    const recent = series.slice(-56);
    const last = recent[recent.length - 1];
    const chart = [
      ...recent.map((s) => ({ date: s.date, actual: s.revenue })),
      ...fc.map((f) => ({ date: f.date, forecast: f.forecast, band: [f.forecast * (1 - bt.band), f.forecast * (1 + bt.band)] })),
    ];
    chart[recent.length - 1] = { ...chart[recent.length - 1], forecast: last.revenue }; // ต่อเส้นให้ไม่ขาด
    const next7 = fc.slice(0, 7).reduce((s, f) => s + f.forecast, 0);
    return { bt, chart, next7, lastDate: last.date, firstForecast: fc[0].date };
  }), [daily, branch]);

  const r = result.value;
  return (
    <>
    <Card title="พยากรณ์ยอดขาย 28 วัน" sub="ค่าเฉลี่ยวันเดียวกันของสัปดาห์ 8 สัปดาห์ล่าสุด · แถบ = ช่วงที่คาดว่าครอบคลุมราว 80% ของวัน"
          right={<div className="flex flex-wrap gap-1">
            {[null, ...BRANCHES].map((b) => (
              <button key={b ?? "all"} onClick={() => setBranch(b)}
                      className={`rounded-lg px-2.5 py-1 text-sm ${branch === b ? "bg-stone-900 text-white" : "text-stone-600 ring-1 ring-stone-200"}`}>{b ?? "รวม"}</button>
            ))}
          </div>}>
      {result.error ? <Pending lab="Lab 4.4" error={result.error} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="คาดการณ์ 7 วันข้างหน้า" value={fmtBaht(r.next7)} />
            <Stat label="ย้อนทดสอบ 28 วัน: คลาดเคลื่อนเฉลี่ยต่อวัน" value={`${r.bt.mapeSeasonal.toFixed(1)}%`} note="วิธีดูวันในสัปดาห์" />
            <Stat label="ถ้าใช้ค่าเฉลี่ย 28 วันเส้นตรง" value={`${r.bt.mapeFlat.toFixed(1)}%`} note="ตัวเปรียบเทียบ" muted />
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={r.chart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={36} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtShortBaht} width={56} domain={[0, "auto"]} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={thaiDay} formatter={(v, n) => [Array.isArray(v) ? `${fmtBaht(v[0])} – ${fmtBaht(v[1])}` : fmtBaht(v), n]} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <ReferenceLine x={r.lastDate} stroke={MUTED} strokeDasharray="3 3" label={{ value: "ข้อมูลถึง", position: "insideTopLeft", fontSize: 11, fill: INK }} />
                <Area name="ช่วงคาดการณ์" dataKey="band" stroke="none" fill={GREEN[1]} isAnimationActive={false} />
                <Line name="ยอดจริง" dataKey="actual" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="คาดการณ์" dataKey="forecast" stroke={MAIN} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Insight>
            {r.bt.mapeFlat > r.bt.mapeSeasonal * 1.5
              ? `${branch ?? "ภาพรวม"}: การดูวันในสัปดาห์ช่วยลดความคลาดเคลื่อนจาก ${r.bt.mapeFlat.toFixed(0)}% เหลือ ${r.bt.mapeSeasonal.toFixed(0)}% เพราะยอดวันธรรมดากับเสาร์-อาทิตย์ต่างกันมาก`
              : `${branch ?? "ภาพรวม"}: สองวิธีแม่นพอ ๆ กัน (${r.bt.mapeSeasonal.toFixed(0)}% กับ ${r.bt.mapeFlat.toFixed(0)}%) ${branch ? "" : "เพราะสาขาออฟฟิศกับห้างขายดีคนละวัน พอรวมกันรูปแบบรายสัปดาห์จึงหักล้างกัน"}`}
            {" "}ใช้วางแผนสต็อกและกะพนักงานรายสัปดาห์ได้ แต่ไม่ควรใช้ตัดสินยอดรายวันของสาขาเดียว
          </Insight>
          <p className="mt-3 text-sm text-stone-500">
            <span className="font-medium text-stone-600">แถบช่วงคาดการณ์คำนวณจากอะไร:</span> ย้อนทดสอบโดยซ่อน 28 วันล่าสุด
            พยากรณ์จากข้อมูลก่อนหน้า แล้วดูว่าแต่ละวันพลาดไปกี่ % นำ % ที่พลาดมาหาส่วนเบี่ยงเบนมาตรฐาน แล้วคูณ 1.28
            ได้ ±{(r.bt.band * 100).toFixed(0)}% รอบเส้นคาดการณ์{branch ? `ของ${branch}` : ""} ถ้าความคลาดเคลื่อนกระจายแบบระฆังคว่ำ
            ยอดจริงราว 8 ใน 10 วันจะตกในแถบนี้ · แถบกว้าง = สาขานั้นยอดแกว่งมาก คาดการณ์รายวันได้ยาก
          </p>
        </>
      )}
    </Card>
    {r && <PrepCard abc={abc} next7={r.next7} branch={branch} start={r.firstForecast} />}
    </>
  );
}

// Lab 4.4B · ควรเตรียมของเท่าไร: ยอดคาดการณ์ 7 วัน × สัดส่วนยอดขายของเมนูกลุ่ม A
function PrepCard({ abc, next7, branch, start }) {
  if (!abc || abc.error) return <Card title="ควรเตรียมของเท่าไร"><Pending lab="Lab 4.2" error={abc?.error ?? "ยังไม่มีผล ABC"} /></Card>;
  const items = abc.items.filter((i) => i.cls === "A").map((i) => ({ ...i, expected: next7 * i.share }));
  const totalA = items.reduce((s, i) => s + i.expected, 0);
  const shareA = items.reduce((s, i) => s + i.share, 0);
  return (
    <Card title="ควรเตรียมของเท่าไร · 7 วันข้างหน้า"
          sub={`${branch ?? "ทุกสาขา"} · เริ่ม ${thaiDay(start)} · ยอดคาดการณ์ ${fmtBaht(next7)} × สัดส่วนยอดขายของเมนูกลุ่ม A ${items.length} เมนู`}>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-stone-500">
            <tr><th className="py-1 font-medium">เมนู</th><th className="font-medium">หมวด</th><th className="text-right font-medium">สัดส่วนยอด</th><th className="text-right font-medium">ควรเตรียมขาย (บาท)</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.product_id} className="border-t border-stone-100">
                <td className="py-1.5">{i.name}</td>
                <td className="text-stone-500">{i.category}</td>
                <td className="text-right tabular-nums">{(i.share * 100).toFixed(1)}%</td>
                <td className="text-right tabular-nums">{fmtBaht(Math.round(i.expected))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-200 font-medium">
              <td className="py-1.5" colSpan={2}>รวมเมนูกลุ่ม A</td>
              <td className="text-right tabular-nums">{(shareA * 100).toFixed(1)}%</td>
              <td className="text-right tabular-nums">{fmtBaht(Math.round(totalA))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Insight>
        เมนูกลุ่ม A {items.length} เมนูคาดว่าจะทำยอด {fmtBaht(Math.round(totalA))} ใน 7 วัน เตรียมวัตถุดิบของเมนูเหล่านี้ให้พอก่อนเมนูอื่น ·
        สัดส่วนเมนูมาจากยอดขายทุกสาขาตลอดช่วงข้อมูล{branch ? " ซึ่งอาจต่างจากเมนูขายดีของสาขานี้" : ""} และยังไม่บวกเผื่อตามแถบช่วงคาดการณ์
      </Insight>
    </Card>
  );
}

// Lab 4.4B (ขยายเอง) · สรุปปีก่อนรายสาขา และอันดับความเสี่ยงถ้าต้องเลิกบางสาขาในปีถัดไป
const RISK_STYLE = {
  "สูง": "bg-red-100 text-red-800", "ค่อนข้างสูง": "bg-amber-100 text-amber-800",
  "ต่ำ": "bg-emerald-50 text-emerald-800", "ต่ำสุด": "bg-emerald-100 text-emerald-900",
  "ยังประเมินไม่ได้": "bg-stone-100 text-stone-600",
};
const thaiYear = (y) => y + 543;
const signedPct = (x) => (x == null ? "–" : `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`);

function BranchRiskCard({ daily, shift }) {
  const result = useMemo(() => tryRun(() => branchRisk(daily, shift)), [daily, shift]);
  if (result.error) return <Card title="สรุปรายปี · ความเสี่ยงรายสาขา"><Pending lab="Lab 4.4" error={result.error} /></Card>;
  const r = result.value;
  const py = thaiYear(r.prevYear), cy = thaiYear(r.curYear);
  const rated = r.branches.filter((b) => b.rank);
  const [first, second] = rated;
  return (
    <Card title={`สรุปปี ${py} · ถ้าต้องเลิกบางสาขาในปี ${cy} ควรพิจารณาสาขาไหนก่อน`}
          sub={`ปี ${py} มีข้อมูล ${thaiDay(r.prevFrom)} – ${thaiDay(r.prevTo)} · ปี ${cy} ถึง ${thaiDay(r.curTo)} · เทียบด้วยยอดขายต่อวันที่เปิด เพราะแต่ละสาขาเปิดไม่เท่ากัน`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="whitespace-nowrap text-left text-stone-500 [&_th]:px-2">
            <tr>
              <th className="py-1 font-medium">อันดับ</th>
              <th className="font-medium">สาขา</th>
              <th className="font-medium">ความเสี่ยง</th>
              <th className="text-right font-medium">ยอดปี {py}</th>
              <th className="text-right font-medium">สัดส่วน</th>
              <th className="text-right font-medium">ยอด/วัน {py}</th>
              <th className="text-right font-medium">ยอด/วัน {cy}</th>
              <th className="text-right font-medium">เปลี่ยนแปลง</th>
              <th className="text-right font-medium">ยอดแกว่ง*</th>
              <th className="font-medium">เหตุผล</th>
            </tr>
          </thead>
          <tbody>
            {r.branches.map((b) => (
              <tr key={b.branch} className="border-t border-stone-100 align-top [&_td]:px-2">
                <td className="py-1.5 tabular-nums">{b.rank ?? "–"}</td>
                <td className="font-medium">{b.branch}</td>
                <td><span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs ${RISK_STYLE[b.risk]}`}>{b.risk}</span></td>
                <td className="text-right tabular-nums">{fmtBaht(b.prevRevenue)}</td>
                <td className="text-right tabular-nums">{(b.prevShare * 100).toFixed(1)}%</td>
                <td className="text-right tabular-nums">{fmtBaht(Math.round(b.prevPerDay))}</td>
                <td className="text-right tabular-nums">{fmtBaht(Math.round(b.curPerDay))}</td>
                <td className="text-right tabular-nums">{signedPct(b.growth)}</td>
                <td className="text-right tabular-nums">{(b.weeklyCv * 100).toFixed(1)}%</td>
                <td className="text-stone-600">
                  {b.isNew ? `เปิด ${thaiDay(b.firstDate)} ข้อมูลไม่ถึง 1 ปี (ปี ${py} มีแค่ ${b.prevDays} วัน)` : (
                    <>
                      {b.risks.length > 0 && <span className="text-red-700">{b.risks.join(" · ")}</span>}
                      {b.risks.length > 0 && b.strengths.length > 0 && " · "}
                      {b.strengths.length > 0 && <span className="text-emerald-700">{b.strengths.join(" · ")}</span>}
                      {!b.risks.length && !b.strengths.length && "อยู่กลางกลุ่มทุกตัวชี้วัด"}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        * ยอดแกว่ง = ส่วนเบี่ยงเบนมาตรฐานของยอดรายสัปดาห์ปี {cy} ÷ ค่าเฉลี่ย · อันดับมาจากการรวมอันดับ 3 ตัวชี้วัด: ยอด/วันปี {cy} (ต่ำ = เสี่ยง),
        การเปลี่ยนแปลงของยอด/วัน (โตช้า = เสี่ยง) และยอดแกว่ง (มาก = เสี่ยง) · สาขาที่เปิดไม่ถึง 1 ปีไม่จัดอันดับ
      </p>
      {first && second && (
        <Insight>
          ถ้าต้องเลิก 1 สาขา ควรพิจารณา <b>{first.branch}</b> ก่อน{first.risks.length > 0 && ` (${first.risks.join(", ")})`}
          {first.strengths.length > 0 && ` แม้จะ${first.strengths.join(" และ")}`} รองลงมาคือ <b>{second.branch}</b>{second.risks.length > 0 && ` (${second.risks.join(", ")})`} ·
          ข้อมูลนี้ไม่มีค่าเช่า ค่าพนักงาน และค่าน้ำไฟ จึงบอกได้แค่สาขาที่ยอดอ่อนที่สุด ไม่ใช่สาขาที่ขาดทุน ก่อนตัดสินจริงให้นำยอด/วันไปเทียบกับต้นทุนต่อวันของแต่ละสาขา
          {rated.every((b) => b.growth > 0) && ` · ทุกสาขายังโตขึ้นจากปี ${py}`}
        </Insight>
      )}
    </Card>
  );
}

function Stat({ label, value, note, muted }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${muted ? "text-stone-500" : ""}`}>{value}</div>
      {note && <div className="text-xs text-stone-400">{note}</div>}
    </div>
  );
}

// Lab 4.5B · ซูมดูยอดจริงเทียบค่าปกติ ±28 วันรอบวันผิดปกติที่เลือก
const ZOOM_DAYS = 28;
const DOWN = "#b91c1c", UP = "#d97706";

function AnomalyZoom({ focus, all, onClose }) {
  const from = addDays(focus.date, -ZOOM_DAYS), to = addDays(focus.date, ZOOM_DAYS);
  const data = all
    .filter((a) => a.branch === focus.branch && a.date >= from && a.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({ date: a.date, actual: a.actual, expected: a.expected }));
  const color = focus.change < 0 ? DOWN : UP;
  return (
    <div className="mb-4 rounded-lg p-3 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{focus.branch} · {thaiDay(focus.date)}</span>{" "}
          <span style={{ color }}>
            {focus.change < 0 ? "▼ ต่ำกว่าปกติ" : "▲ สูงกว่าปกติ"} {Math.round(Math.abs(focus.change) * 100)}%
          </span>
          <span className="text-stone-500"> · ยอดจริง {fmtBaht(focus.actual)} ปกติ {fmtBaht(focus.expected)} · แสดง ±{ZOOM_DAYS} วัน</span>
        </p>
        <button onClick={onClose} aria-label="ปิดกราฟ"
                className="rounded-lg px-3 py-1 text-sm text-stone-500 ring-1 ring-stone-300 hover:bg-stone-100">ปิด ✕</button>
      </div>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={28} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmtShortBaht} width={56} domain={[0, "auto"]} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={thaiDay} formatter={(v, n) => [fmtBaht(v), n]} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line name="ยอดจริง" dataKey="actual" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line name="ค่าปกติ" dataKey="expected" stroke={MAIN} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            <ReferenceLine x={focus.date} stroke={color} strokeOpacity={0.4} />
            <ReferenceDot x={focus.date} y={focus.actual} r={6} fill={color} stroke="#fff" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnomalyCard({ daily, holidays }) {
  const [focus, setFocus] = useState(null);
  const result = useMemo(() => tryRun(() => scoreAnomalies(daily, holidays)), [daily, holidays]);
  if (result.error) return <Card title="วันที่ยอดขายผิดปกติ"><Pending lab="Lab 4.5" error={result.error} /></Card>;
  const all = result.value;
  const top = all.filter((a) => !a.holiday).slice(0, 15);
  // วันหยุดที่ยอดเปลี่ยนมาก รวมวันหยุดเดียวกันของสาขาเดียวกัน (เช่น สงกรานต์หลายวัน) เป็นรายการเดียว
  const holidayHits = [];
  for (const a of all.filter((x) => x.holiday)) {
    const hit = holidayHits.find((h) => h.holiday === a.holiday && h.branch === a.branch);
    if (hit) hit.days += 1;
    else if (holidayHits.length < 3) holidayHits.push({ holiday: a.holiday, branch: a.branch, days: 1 });
  }
  return (
    <Card title="วันที่ยอดขายผิดปกติ 15 อันดับ"
          sub="เทียบกับค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน · ไม่นับวันหยุดราชการ">
      {focus && <AnomalyZoom focus={focus} all={all} onClose={() => setFocus(null)} />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm tabular-nums">
          <thead className="text-left text-stone-500">
            <tr><th className="py-1 font-medium">#</th><th className="font-medium">วันที่</th><th className="font-medium">สาขา</th>
              <th className="text-right font-medium">ยอดจริง</th><th className="text-right font-medium">ปกติ</th><th className="pl-4 font-medium">ต่างจากปกติ</th></tr>
          </thead>
          <tbody>
            {top.map((a, i) => {
              const sel = focus && focus.date === a.date && focus.branch === a.branch;
              return (
                <tr key={a.date + a.branch} onClick={() => setFocus(sel ? null : a)}
                    className={`cursor-pointer border-t border-stone-100 hover:bg-stone-50 ${sel ? "bg-emerald-50" : ""}`}>
                  <td className="py-1.5 text-stone-400">{i + 1}</td>
                  <td>{thaiDay(a.date)} <span className="text-stone-400">{new Date(a.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short" })}</span></td>
                  <td>{a.branch}</td>
                  <td className="text-right">{fmtBaht(a.actual)}</td>
                  <td className="text-right text-stone-500">{fmtBaht(a.expected)}</td>
                  <td className="pl-4">
                    {a.change < 0
                      ? <span className="font-medium text-red-700">▼ ต่ำกว่าปกติ {Math.round(-a.change * 100)}%</span>
                      : <span className="font-medium text-amber-700">▲ สูงกว่าปกติ {Math.round(a.change * 100)}%</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Insight>
        อันดับต้น ๆ คือวันที่ควรโทรถามผู้จัดการสาขาว่าเกิดอะไรขึ้น · ระบบบอกได้ว่า “ผิดปกติ” แต่บอกไม่ได้ว่า “เพราะอะไร”
        {holidayHits.length > 0 && <> · วันหยุดที่ยอดเปลี่ยนมากแต่ไม่นับ เช่น {holidayHits.map((h) => `${h.holiday} (${h.branch}${h.days > 1 ? ` ${h.days} วัน` : ""})`).join(", ")}</>}
      </Insight>
    </Card>
  );
}

export default function ForecastTab({ source }) {
  const state = useAnalytics(source);
  return (
    <AnalyticsShell source={source} state={state} title="พยากรณ์และวันผิดปกติ">
      {(d) => d.daily.error ? <Pending lab="pipeline" error={d.daily.error} /> : (
        <div className="space-y-6">
          {d.meta.alerts?.length > 0 && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              🚨 ยอดวันล่าสุดผิดปกติ: {d.meta.alerts.map((a) => `${a.branch} ${fmtBaht(a.actual)} (ปกติ ${fmtBaht(a.expected)})`).join(", ")}
            </p>
          )}
          <ForecastCard daily={d.daily.rows} abc={d.abc} />
          <BranchRiskCard daily={d.daily.rows} shift={d.meta.shift ?? 0} />
          <AnomalyCard daily={d.daily.rows} holidays={d.meta.holidays ?? {}} />
        </div>
      )}
    </AnalyticsShell>
  );
}
