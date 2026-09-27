// Lab 2.2 · กราฟที่ซ่อมแล้ว (เทียบกับ BadCharts.jsx ซ้าย-ขวา)
// ทุกกราฟ: สีหลักสีเดียว · ตัวเลขมี ฿ และจุลภาค · ข้อความสรุปคำนวณจากข้อมูลจริง
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import {
  revenueByProduct, monthlyRevenue, branchPerformance, weeklyRevenue, daysInMonth, thaiMonth,
} from "./lab2Metrics.js";

// ---------- ค่าที่ใช้ร่วมกัน ----------
const BRAND = "#7e22ce"; // สีหลักสีเดียวของ Dashboard
const MUTED = "#d8b4fe"; // สีเดียวกันแต่อ่อนลง ใช้บอก "ข้อมูลไม่ครบ"
const AXIS = { fontSize: 12, fill: "#57534e" };

const baht = (n) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const pct = (x) => `${(x * 100).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`;
const times = (x) => x.toLocaleString("th-TH", { maximumFractionDigits: 1 });
const thaiDay = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
const tipStyle = { borderRadius: 8, fontSize: 13 };

// โครงของแต่ละกราฟ: ข้อความสรุป 1 บรรทัด + พื้นที่กราฟ
function Frame({ summary, children }) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-sm font-medium leading-snug text-stone-800">{summary}</p>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

// ---------- กราฟ 1: เมนูไหนทำเงินมากที่สุด ----------
// pie 40 ชิ้น → แท่งแนวนอนเรียงมากไปน้อย 10 อันดับ อ่านชื่อและเทียบความยาวได้ทันที
export function FixedChart1({ rows, products }) {
  const all = useMemo(() => revenueByProduct(rows, products), [rows, products]);
  const top = all.slice(0, 10);
  if (!top.length) return <Frame summary="ไม่มีข้อมูล" />;
  const top3Share = all.slice(0, 3).reduce((s, d) => s + d.share, 0);
  const summary = `${top[0].name} ทำเงินสูงสุด ${baht(top[0].revenue)} (${pct(top[0].share)}) · 3 อันดับแรกรวม ${pct(top3Share)} ของยอดขาย`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ left: 4, right: 80 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={110} tick={AXIS} interval={0} />
          <Tooltip formatter={(v) => [baht(v), "ยอดขาย"]} contentStyle={tipStyle} />
          <Bar dataKey="revenue" fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="revenue" position="right" formatter={baht} style={{ fontSize: 11, fill: "#44403c" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 2: สาขาขายต่างกันแค่ไหน ----------
// แกนเริ่มที่ 0 (ความยาวแท่งเทียบกันได้จริง) · เรียงตามยอด · สีเดียว
export function FixedChart2({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.revenue - a.revenue), [rows]);
  if (!data.length) return <Frame summary="ไม่มีข้อมูล" />;
  const hi = data[0];
  const lo = data[data.length - 1];
  const summary = `${hi.branch} ขายได้ ${baht(hi.revenue)} = ${times(hi.revenue / lo.revenue)} เท่าของ${lo.branch} (${baht(lo.revenue)})`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 90 }}>
          <XAxis type="number" domain={[0, "dataMax"]} hide />
          <YAxis type="category" dataKey="branch" width={90} tick={AXIS} />
          <Tooltip formatter={(v) => [baht(v), "ยอดขายรวม"]} contentStyle={tipStyle} />
          <Bar dataKey="revenue" fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="revenue" position="right" formatter={baht} style={{ fontSize: 11, fill: "#44403c" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 3: ยอดขายโตขึ้นหรือลดลง ----------
// รายวัน 538 จุดมีแต่ความผันผวน → รวมเป็นรายสัปดาห์ (เฉพาะสัปดาห์ครบ 7 วัน) เส้นบาง ไม่มีจุด แกนเริ่ม 0
export function FixedChart3({ rows }) {
  const data = useMemo(() => weeklyRevenue(rows), [rows]);
  if (data.length < 2) return <Frame summary="ข้อมูลไม่พอดูแนวโน้ม" />;
  const k = Math.min(8, Math.floor(data.length / 2)); // เทียบ k สัปดาห์แรก กับ k สัปดาห์ล่าสุด
  const avg = (arr) => arr.reduce((s, d) => s + d.revenue, 0) / arr.length;
  const first = avg(data.slice(0, k));
  const last = avg(data.slice(-k));
  const change = last / first - 1;
  const summary = `เฉลี่ย ${k} สัปดาห์ล่าสุด ${baht(last)}/สัปดาห์ ${change >= 0 ? "โตขึ้น" : "ลดลง"} ${pct(Math.abs(change))} จาก ${k} สัปดาห์แรก (${baht(first)})`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="week" tick={AXIS} tickFormatter={(w) => thaiMonth(w.slice(0, 7))} minTickGap={40} />
          <YAxis tick={AXIS} tickFormatter={baht} width={80} domain={[0, "auto"]} />
          <Tooltip labelFormatter={(w) => `สัปดาห์เริ่ม ${thaiDay(w)}`} formatter={(v) => [baht(v), "ยอดทั้งสัปดาห์"]} contentStyle={tipStyle} />
          <Line dataKey="revenue" stroke={BRAND} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 4: เดือนล่าสุดยอดตกจริงไหม ----------
// ยอดรวมหลอกตาเมื่อเดือนมีวันไม่ครบ → ใช้ "ยอดเฉลี่ยต่อวัน" และทำแท่งเดือนที่ไม่ครบเป็นสีอ่อน
export function FixedChart4({ rows }) {
  const data = useMemo(
    () => monthlyRevenue(rows).map((m) => {
      const full = daysInMonth(m.month);
      return { ...m, full, partial: m.days < full };
    }),
    [rows]
  );
  if (data.length < 2) return <Frame summary="ข้อมูลไม่พอเทียบเดือน" />;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const change = last.perDay / prev.perDay - 1;
  const trend = `เฉลี่ย ${baht(last.perDay)}/วัน ${change >= 0 ? "สูงกว่า" : "ต่ำกว่า"}เดือนก่อน ${pct(Math.abs(change))}`;
  const summary = last.partial
    ? `${thaiMonth(last.month)} มีข้อมูล ${last.days}/${last.full} วัน · ${trend} · ถ้าครบเดือนคาด ≈ ${baht(last.perDay * last.full)}`
    : `${thaiMonth(last.month)} ${trend}`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="month" tick={AXIS} tickFormatter={thaiMonth} minTickGap={8} />
          <YAxis tick={AXIS} tickFormatter={baht} width={70} />
          <Tooltip
            labelFormatter={thaiMonth}
            formatter={(v, _n, item) => {
              const p = item.payload;
              return [`${baht(v)}/วัน (รวม ${baht(p.revenue)} · ${p.days}/${p.full} วัน${p.partial ? " ไม่ครบ" : ""})`, "เฉลี่ยต่อวัน"];
            }}
            contentStyle={tipStyle}
          />
          <Bar dataKey="perDay" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.month} fill={d.partial ? MUTED : BRAND} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 5: ผลงานผู้จัดการสาขา ----------
// ยอดรวมไม่ยุติธรรมกับสาขาที่เปิดทีหลัง → ใช้ "ยอดเฉลี่ยต่อวันที่เปิดขาย" กำกับจำนวนวัน และไม่ตีตราว่าใครแย่
export function FixedChart5({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.perDay - a.perDay), [rows]);
  if (!data.length) return <Frame summary="ไม่มีข้อมูล" />;
  const maxDays = Math.max(...data.map((d) => d.days));
  const lowTotal = [...data].sort((a, b) => a.revenue - b.revenue)[0];
  const rank = data.findIndex((d) => d.branch === lowTotal.branch) + 1;
  const summary = lowTotal.days < maxDays
    ? `${lowTotal.branch} ยอดรวมต่ำสุดแต่เปิดขายแค่ ${lowTotal.days.toLocaleString("th-TH")} วัน (สาขาอื่นสูงสุด ${maxDays.toLocaleString("th-TH")} วัน) · เทียบต่อวันอยู่อันดับ ${rank} จาก ${data.length}`
    : `ทุกสาขาเปิดขาย ${maxDays.toLocaleString("th-TH")} วันเท่ากัน · ${data[0].branch} เฉลี่ยสูงสุด ${baht(data[0].perDay)}/วัน`;
  const withLabel = data.map((d) => ({ ...d, label: `${baht(d.perDay)}/วัน · ${d.days.toLocaleString("th-TH")} วัน` }));
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={withLabel} layout="vertical" margin={{ left: 4, right: 130 }}>
          <XAxis type="number" domain={[0, "dataMax"]} hide />
          <YAxis type="category" dataKey="branch" width={90} tick={AXIS} />
          <Tooltip
            formatter={(v, _n, item) => {
              const p = item.payload;
              return [`${baht(v)}/วัน (รวม ${baht(p.revenue)} จาก ${p.days.toLocaleString("th-TH")} วัน)`, "เฉลี่ยต่อวัน"];
            }}
            contentStyle={tipStyle}
          />
          <Bar dataKey="perDay" fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="label" position="right" style={{ fontSize: 11, fill: "#44403c" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
