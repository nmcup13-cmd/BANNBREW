// ⚠️ กราฟในไฟล์นี้ "ตั้งใจทำให้แย่" เพื่อฝึกวิจารณ์ (แบบเดียวกับ src/lab2/BadCharts.jsx)
// กราฟที่ซ่อมแล้วอยู่ใน FixedCustomerCharts.jsx
import { useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { groupMembers, monthlyJoins, branchMembers } from "./customerMetrics.js";

const rainbow = (i, n) => `hsl(${Math.round((i * 360) / n)}, 85%, 55%)`;

/** กราฟ 1: ช่วงอายุใน pie สีรุ้ง เรียงตามตัวอักษร ("ต่ำกว่า 18" ไปอยู่ท้ายสุด) */
export function BadCustomerChart1({ data }) {
  const rows = useMemo(
    () => groupMembers(data.members, "age_group").sort((a, b) => a.name.localeCompare(b.name, "th")),
    [data]
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="count" nameKey="name" outerRadius="70%" startAngle={45} endAngle={405}
             label={({ percent }) => `${(percent * 100).toFixed(0)}%`} isAnimationActive={false}>
          {rows.map((d, i) => <Cell key={d.name} fill={rainbow(i, rows.length)} />)}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** กราฟ 2: สมาชิกใหม่รายเดือน ไม่บอกว่าเดือนสุดท้ายข้อมูลไม่ครบ แล้วติดป้าย "สมัครตก!" */
export function BadCustomerChart2({ data }) {
  const rows = useMemo(() => monthlyJoins(data.members), [data]);
  const last = rows[rows.length - 1];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 9 }} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" isAnimationActive={false}>
          {rows.map((d) => <Cell key={d.month} fill={d === last ? "#dc2626" : "#64748b"} />)}
          <LabelList dataKey="count" position="top"
                     content={({ x, y, width, index }) => index === rows.length - 1 ? (
                       <text x={x + width / 2 - 30} y={y - 8} fill="#dc2626" fontSize={12} fontWeight={700}>สมัครตก! ⚠️</text>
                     ) : null} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** กราฟ 3: สมาชิกตามรหัสสาขา (B01–B05) แกน Y เริ่ม 380 สีรุ้ง และไม่คิดว่าบางสาขาเปิดทีหลัง */
export function BadCustomerChart3({ data }) {
  const rows = useMemo(
    () => groupMembers(data.members, "home_branch_id").sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[380, 800]} allowDataOverflow />
        <Tooltip />
        <Bar dataKey="count" isAnimationActive={false}>
          {rows.map((d, i) => <Cell key={d.name} fill={rainbow(i, rows.length)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** กราฟ 4: "ยอดซื้อรวม" ตามช่วงอายุ → กลุ่มที่คนเยอะชนะเสมอ */
export function BadCustomerChart4({ data }) {
  const rows = useMemo(() => groupMembers(data.members, "age_group").sort((a, b) => b.spend - a.spend), [data]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="spend" isAnimationActive={false}>
          {rows.map((d, i) => <Cell key={d.name} fill={i === 0 ? "#16a34a" : "#94a3b8"} />)}
          <LabelList dataKey="name" position="top"
                     content={({ x, y, width, index }) => index === 0 ? (
                       <text x={x + width / 2 - 30} y={y - 8} fill="#16a34a" fontSize={12} fontWeight={700}>ลูกค้าดีที่สุด 🏆</text>
                     ) : null} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** กราฟ 5: จำนวนครั้งที่ซื้อเฉลี่ยตามเพศ แกน Y เริ่ม 5.1 ทำให้ต่างกันนิดเดียวดูเหมือนต่างมาก */
export function BadCustomerChart5({ data }) {
  const rows = useMemo(() => groupMembers(data.members, "gender"), [data]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[5.1, 5.5]} allowDataOverflow />
        <Tooltip />
        <Bar dataKey="avgBills" isAnimationActive={false}>
          {rows.map((d, i) => <Cell key={d.name} fill={["#ec4899", "#3b82f6", "#a3a3a3"][i % 3]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
