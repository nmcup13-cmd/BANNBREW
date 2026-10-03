// ฟังก์ชันคำนวณสำหรับแท็บ "Lab ลูกค้า" · ใช้ร่วมกันทั้งกราฟก่อนซ่อมและหลังซ่อม
// data = { members, branchOpen, lastDate } จาก loadCustomerData()
import Papa from "papaparse";

export const BRANCH_NAME = { B01: "สยาม", B02: "สีลม", B03: "อารีย์", B04: "บางนา", B05: "มหาวิทยาลัย" };
export const AGE_ORDER = ["ต่ำกว่า 18", "18-24", "25-34", "35-44", "45-54", "55+"];

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  const text = (await res.text()).replace(/^\uFEFF/, "");
  return Papa.parse(text, { header: true, skipEmptyLines: "greedy" }).data;
}

/** โหลด customers.csv + sales.csv แล้วรวมเป็นข้อมูลรายสมาชิก (จำนวนบิล, ยอดซื้อสะสม) */
export async function loadCustomerData() {
  const [customers, sales] = await Promise.all([fetchCsv("/customers.csv"), fetchCsv("/sales.csv")]);
  const bills = new Map();
  const branchOpen = {};
  let lastDate = "";
  for (const r of sales) {
    const day = r.datetime.slice(0, 10);
    if (!branchOpen[r.branch] || day < branchOpen[r.branch]) branchOpen[r.branch] = day;
    if (day > lastDate) lastDate = day;
    const b = bills.get(r.order_id) ?? { customer: r.customer_id ?? "", total: 0 };
    b.total += Number(r.qty) * Number(r.unit_price);
    bills.set(r.order_id, b);
  }
  const per = new Map();
  for (const b of bills.values()) {
    if (!b.customer) continue;
    const p = per.get(b.customer) ?? { bills: 0, spend: 0 };
    p.bills++;
    p.spend += b.total;
    per.set(b.customer, p);
  }
  const members = customers.map((c) => ({
    ...c,
    branch: BRANCH_NAME[c.home_branch_id] ?? c.home_branch_id,
    bills: per.get(c.customer_id)?.bills ?? 0,
    spend: per.get(c.customer_id)?.spend ?? 0,
  }));
  return { members, branchOpen, lastDate };
}

/** จัดกลุ่มสมาชิกตามคีย์: จำนวนคน, ยอดซื้อรวม, ยอดซื้อเฉลี่ย/คน, จำนวนบิลเฉลี่ย/คน, สัดส่วน */
export function groupMembers(members, key) {
  const map = new Map();
  for (const m of members) {
    const g = map.get(m[key]) ?? { name: m[key], count: 0, spend: 0, bills: 0 };
    g.count++;
    g.spend += m.spend;
    g.bills += m.bills;
    map.set(m[key], g);
  }
  return [...map.values()].map((g) => ({
    ...g, avgSpend: g.spend / g.count, avgBills: g.bills / g.count, share: g.count / members.length,
  }));
}

export const byAge = (members) =>
  groupMembers(members, "age_group").sort((a, b) => AGE_ORDER.indexOf(a.name) - AGE_ORDER.indexOf(b.name));

/** สมาชิกใหม่รายเดือน พร้อมจำนวนวันที่มีข้อมูลในเดือนนั้น */
export function monthlyJoins(members) {
  const map = new Map();
  let last = "";
  for (const m of members) {
    const ym = m.joined_date.slice(0, 7);
    map.set(ym, (map.get(ym) ?? 0) + 1);
    if (m.joined_date > last) last = m.joined_date;
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const full = daysInMonth(month);
      const days = month === last.slice(0, 7) ? Number(last.slice(8, 10)) : full;
      return { month, count, days, full, perDay: count / days, partial: days < full };
    });
}

/** สมาชิกตามสาขาประจำ + จำนวนวันที่สาขาเปิด และสมาชิกใหม่เฉลี่ยต่อ 30 วัน */
export function branchMembers({ members, branchOpen }) {
  const lastJoin = members.reduce((a, m) => (m.joined_date > a ? m.joined_date : a), "");
  return groupMembers(members, "branch").map((g) => {
    const open = branchOpen[g.name] ?? lastJoin;
    const days = Math.round((new Date(lastJoin) - new Date(open)) / 86400000) + 1;
    return { ...g, open, days, per30: (g.count / days) * 30 };
  });
}

export const daysInMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export const thaiMonth = (ym) =>
  new Date(ym + "-01T00:00:00").toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
