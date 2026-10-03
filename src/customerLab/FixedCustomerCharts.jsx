// กราฟลูกค้าที่ซ่อมแล้ว (เทียบกับ BadCustomerCharts.jsx ซ้าย-ขวา)
// ทุกกราฟ: สีหลักสีเดียว · ตัวเลขมี ฿ / จุลภาค · ข้อความสรุปคำนวณจากข้อมูลจริง
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { byAge, monthlyJoins, branchMembers, groupMembers, thaiMonth } from "./customerMetrics.js";

const BRAND = "#7e22ce";
const MUTED = "#d8b4fe";
const AXIS = { fontSize: 12, fill: "#57534e" };
const LABEL = { fontSize: 11, fill: "#44403c" };
const TIP = { borderRadius: 8, fontSize: 13 };

const num = (n) => Math.round(n).toLocaleString("th-TH");
const baht = (n) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const pct = (x) => `${(x * 100).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`;
const dec = (x) => x.toLocaleString("th-TH", { maximumFractionDigits: 1 });

function Frame({ summary, children }) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-sm font-medium leading-snug text-stone-800">{summary}</p>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

// ---------- กราฟ 1: ลูกค้ากลุ่มอายุไหนมากที่สุด ----------
// pie สีรุ้งเรียงตามตัวอักษร → แท่งเรียงตามลำดับอายุจริง สีเดียว มีจำนวนและ %
export function FixedCustomerChart1({ data }) {
  const rows = useMemo(() => byAge(data.members), [data]);
  const top = [...rows].sort((a, b) => b.count - a.count)[0];
  const young = rows.filter((r) => r.name === "18-24" || r.name === "25-34").reduce((s, r) => s + r.share, 0);
  const summary = `กลุ่มใหญ่สุดคือ ${top.name} ปี ${num(top.count)} คน (${pct(top.share)}) · อายุ 18–34 รวม ${pct(young)} ของสมาชิก`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="name" tick={AXIS} interval={0} />
          <YAxis tick={AXIS} tickFormatter={num} width={48} />
          <Tooltip formatter={(v, _n, i) => [`${num(v)} คน (${pct(i.payload.share)})`, "สมาชิก"]} contentStyle={TIP} />
          <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="share" position="top" formatter={pct} style={LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 2: เดือนล่าสุดคนสมัครน้อยลงจริงไหม ----------
// เดือนสุดท้ายมีข้อมูลไม่ครบ → ใช้ "สมาชิกใหม่เฉลี่ยต่อวัน" และทำแท่งเดือนที่ไม่ครบเป็นสีอ่อน
export function FixedCustomerChart2({ data }) {
  const rows = useMemo(() => monthlyJoins(data.members), [data]);
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const change = last.perDay / prev.perDay - 1;
  const summary = `${thaiMonth(last.month)} มีข้อมูล ${last.days}/${last.full} วัน · เฉลี่ย ${dec(last.perDay)} คน/วัน ${
    change >= 0 ? "สูงกว่า" : "ต่ำกว่า"}เดือนก่อน ${pct(Math.abs(change))}${
    last.partial ? ` · ถ้าครบเดือนคาด ≈ ${num(last.perDay * last.full)} คน` : ""}`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="month" tick={AXIS} tickFormatter={thaiMonth} minTickGap={12} />
          <YAxis tick={AXIS} width={36} tickFormatter={dec} />
          <Tooltip
            labelFormatter={thaiMonth}
            formatter={(v, _n, i) => [`${dec(v)} คน/วัน (รวม ${num(i.payload.count)} คน · ${i.payload.days}/${i.payload.full} วัน)`, "สมาชิกใหม่"]}
            contentStyle={TIP}
          />
          <Bar dataKey="perDay" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {rows.map((d) => <Cell key={d.month} fill={d.partial ? MUTED : BRAND} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 3: สาขาไหนหาสมาชิกใหม่ได้เก่งที่สุด ----------
// รหัส B0x อ่านไม่ออก + แกนไม่เริ่ม 0 + สาขาเปิดไม่พร้อมกัน → ชื่อสาขา, แกนเริ่ม 0, "สมาชิกใหม่ต่อ 30 วันที่เปิด"
export function FixedCustomerChart3({ data }) {
  const rows = useMemo(() => branchMembers(data).sort((a, b) => b.per30 - a.per30), [data]);
  const fewest = [...rows].sort((a, b) => a.count - b.count)[0];
  const maxDays = Math.max(...rows.map((r) => r.days));
  const rank = rows.findIndex((r) => r.name === fewest.name) + 1;
  const summary = fewest.days < maxDays
    ? `${fewest.name} สมาชิกรวมน้อยสุด (${num(fewest.count)} คน) แต่เปิดมาแค่ ${num(fewest.days)} วัน · เทียบต่อ 30 วันอยู่อันดับ ${rank} จาก ${rows.length}`
    : `${rows[0].name} หาสมาชิกใหม่ได้มากสุด ${dec(rows[0].per30)} คน/30 วัน`;
  const labeled = rows.map((r) => ({ ...r, label: `${dec(r.per30)} คน · เปิด ${num(r.days)} วัน` }));
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={labeled} layout="vertical" margin={{ left: 4, right: 130 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="name" width={90} tick={AXIS} />
          <Tooltip formatter={(v, _n, i) => [`${dec(v)} คน/30 วัน (รวม ${num(i.payload.count)} คน)`, "สมาชิกใหม่"]} contentStyle={TIP} />
          <Bar dataKey="per30" fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="label" position="right" style={LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 4: ลูกค้ากลุ่มไหนมีมูลค่าต่อคนสูงสุด ----------
// ยอดรวมแปรตามจำนวนคน → ใช้ "ยอดซื้อเฉลี่ยต่อสมาชิก" เรียงตามอายุ และบอกจำนวนคนกำกับ
export function FixedCustomerChart4({ data }) {
  const rows = useMemo(() => byAge(data.members), [data]);
  const hi = [...rows].sort((a, b) => b.avgSpend - a.avgSpend)[0];
  const bigTotal = [...rows].sort((a, b) => b.spend - a.spend)[0];
  const summary = `ต่อคน ${hi.name} ปี จ่ายสูงสุด ${baht(hi.avgSpend)} · ${bigTotal.name} ปี ยอดรวมสูงสุดเพราะมีคนมาก (${num(bigTotal.count)} คน) แต่ต่อคน ${baht(bigTotal.avgSpend)}`;
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="name" tick={AXIS} interval={0} />
          <YAxis tick={AXIS} tickFormatter={baht} width={60} />
          <Tooltip formatter={(v, _n, i) => [`${baht(v)}/คน (${num(i.payload.count)} คน · รวม ${baht(i.payload.spend)})`, "ยอดซื้อเฉลี่ย"]} contentStyle={TIP} />
          <Bar dataKey="avgSpend" fill={BRAND} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="avgSpend" position="top" formatter={baht} style={LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// ---------- กราฟ 5: ผู้หญิงซื้อบ่อยกว่าผู้ชายมากไหม ----------
// แกน Y เริ่ม 5.1 ขยายความต่าง → แกนเริ่ม 0 แนวนอน สีเดียว (ไม่ใช้สีชมพู/ฟ้าตามเพศ) และบอกว่าต่างกันกี่ %
export function FixedCustomerChart5({ data }) {
  const rows = useMemo(() => groupMembers(data.members, "gender").sort((a, b) => b.avgBills - a.avgBills), [data]);
  // เทียบหญิงกับชายตามคำถาม ถ้าไม่มีทั้งสองกลุ่มให้เทียบกลุ่มสูงสุดกับต่ำสุด
  const f = rows.find((r) => r.name === "หญิง");
  const m = rows.find((r) => r.name === "ชาย");
  const [hi, lo] = f && m ? (f.avgBills >= m.avgBills ? [f, m] : [m, f]) : [rows[0], rows[rows.length - 1]];
  const gap = hi.avgBills / lo.avgBills - 1;
  const summary = `${hi.name} ซื้อเฉลี่ย ${dec(hi.avgBills)} ครั้ง/คน · ${lo.name} ${dec(lo.avgBills)} ครั้ง · ต่างกัน ${dec(hi.avgBills - lo.avgBills)} ครั้ง (${pct(gap)})${
    gap < 0.1 ? " ซึ่งน้อยมาก ไม่พอเป็นเหตุผลให้ทำโปรฯ แยกเพศ" : ""}`;
  const labeled = rows.map((r) => ({ ...r, label: `${dec(r.avgBills)} ครั้ง · ${num(r.count)} คน` }));
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={labeled} layout="vertical" margin={{ left: 4, right: 120 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="name" width={70} tick={AXIS} />
          <Tooltip formatter={(v) => [`${dec(v)} ครั้ง/คน`, "ซื้อเฉลี่ย"]} contentStyle={TIP} />
          <Bar dataKey="avgBills" fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="label" position="right" style={LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
