// Lab 3.1 · แปลงแถวจาก sales.csv (ผลลัพธ์ Lab 2.1) เป็นเอกสาร Firestore
// scripts/seed.mjs เรียกใช้ฟังก์ชันเหล่านี้ ไม่ต้องแก้ seed.mjs
//
// วันที่คำนวณด้วย addDays / daysBetween จาก src/lab3/time.js เท่านั้น
// ไม่ใช้ new Date(...).toISOString() กับวันที่ไทย เพราะจะกลายเป็นเวลา UTC และวันเลื่อน
//
// ทำไม customer_id ว่างต้องเป็น null: ใน Firestore "" คือข้อความที่มีค่า ส่วน null คือ "ไม่มีข้อมูล"
//   การนับลูกค้า / query where("customer_id", "!=", null) และ Security Rules จะทำงานถูกต้องเมื่อใช้ null
// ทำไม document id = order_id-product_id: 1 บิลมีหลายเมนู ใช้ order_id อย่างเดียวจะเขียนทับกัน
//   และ id ที่คงที่ทำให้รัน seed ซ้ำได้โดยไม่เกิดข้อมูลซ้ำ (เขียนทับเอกสารเดิม)
import { addDays, daysBetween } from "../src/lab3/time.js";

export const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];

// datetime ที่สะอาดแล้วจาก Lab 2.1: ปี ค.ศ. 20YY, มีวินาที, เขตเวลา +07:00
const DATETIME_RE = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\+07:00$/;
const INT_RE = /^\d+$/;              // จำนวนเต็ม (ไม่มีจุด ไม่มีเครื่องหมาย ไม่มีหน่วย)
const NUMBER_RE = /^\d+(\.\d+)?$/;   // ตัวเลขล้วน เช่น 65 หรือ 65.5 (ไม่รับ "65.00 บาท" หรือ "-55")

/**
 * เลือกเฉพาะ N วันล่าสุดของข้อมูล นับจากวันล่าสุดในไฟล์ (ไม่ใช่วันนี้) รวมวันสุดท้ายด้วย
 * @returns {{ rows: object[], start: string, end: string }}  start/end เป็น YYYY-MM-DD
 */
export function selectLastDays(rows, days) {
  if (!rows.length) return { rows: [], start: "", end: "" };
  const end = rows.reduce((max, r) => {
    const d = String(r.datetime).slice(0, 10);
    return d > max ? d : max;
  }, "");
  const start = addDays(end, -(days - 1));
  const picked = rows.filter((r) => {
    const d = String(r.datetime).slice(0, 10);
    return d >= start && d <= end;
  });
  return { rows: picked, start, end };
}

/** จำนวนวันที่ต้องเลื่อน ให้วันล่าสุดของข้อมูลกลายเป็น "เมื่อวาน" ของ today · ห้ามติดลบ */
export function computeShift(lastDataDate, today) {
  const yesterday = addDays(today, -1);
  return Math.max(0, daysBetween(lastDataDate, yesterday));
}

/** เลื่อนวันที่ใน datetime ("2026-09-20T16:05:09+07:00") ไป days วัน โดยคงเวลาและ +07:00 */
export function shiftDateTime(iso, days) {
  if (!days) return iso;
  return addDays(iso.slice(0, 10), days) + iso.slice(10);
}

/**
 * แปลง 1 แถว CSV (ทุกค่าเป็นข้อความ) เป็น { id, data }
 * ต้อง throw Error ถ้าข้อมูลยังไม่สะอาด
 */
export function toSaleDoc(row, shiftDays = 0) {
  const ref = `${row.order_id}-${row.product_id}`;
  const qtyText = String(row.qty ?? "").trim();
  const priceText = String(row.unit_price ?? "").trim();
  const datetime = String(row.datetime ?? "").trim();
  const branch = row.branch;

  if (!INT_RE.test(qtyText) || Number(qtyText) <= 0)
    throw new Error(`${ref}: qty "${row.qty}" ต้องเป็นจำนวนเต็มบวก`);
  if (!NUMBER_RE.test(priceText) || Number(priceText) <= 0)
    throw new Error(`${ref}: unit_price "${row.unit_price}" ต้องเป็นตัวเลขบวก`);
  if (!BRANCHES.includes(branch))
    throw new Error(`${ref}: สาขา "${branch}" ไม่อยู่ใน 5 ชื่อมาตรฐาน`);
  if (!DATETIME_RE.test(datetime))
    throw new Error(`${ref}: datetime "${row.datetime}" ต้องเป็น 20YY-MM-DDTHH:MM:SS+07:00`);
  if (!row.order_id || !row.product_id)
    throw new Error(`${ref}: ต้องมี order_id และ product_id`);

  const qty = Number(qtyText);
  const unit_price = Number(priceText);
  const dt = shiftDateTime(datetime, shiftDays);
  const customer = String(row.customer_id ?? "").trim();

  return {
    id: ref,
    data: {
      order_id: row.order_id,
      datetime: dt,
      date: dt.slice(0, 10),             // ตัดจากข้อความ = วันตามเวลาไทย (ไม่ผ่าน new Date)
      hour: Number(dt.slice(11, 13)),
      branch,
      product_id: row.product_id,
      qty,
      unit_price,
      revenue: qty * unit_price,
      customer_id: customer === "" ? null : customer,
      payment_method: row.payment_method,
      channel: row.channel,
      source: "import",
    },
  };
}

/** สรุป: { docs, bills (นับ order_id ไม่ซ้ำ), revenue, byBranch: {สาขา: ยอด}, start, end } */
export function summarize(docs) {
  const orders = new Set();
  const byBranch = {};
  let revenue = 0;
  let start = "";
  let end = "";
  for (const { data } of docs) {
    orders.add(data.order_id);
    revenue += data.revenue;
    byBranch[data.branch] = (byBranch[data.branch] ?? 0) + data.revenue;
    if (!start || data.date < start) start = data.date;
    if (!end || data.date > end) end = data.date;
  }
  return { docs: docs.length, bills: orders.size, revenue, byBranch, start, end };
}
