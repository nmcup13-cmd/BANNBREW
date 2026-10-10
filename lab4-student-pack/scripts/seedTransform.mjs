// แปลงแถวจาก sales.csv (ผลลัพธ์ Lab 2.1) เป็นเอกสาร Firestore
// ทุกฟังก์ชันในไฟล์นี้ต้องผ่าน scripts/seedTransform.test.mjs (npm test)
import { addDays, daysBetween } from "../src/lab3/time.js";

export const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];

/** เลือกเฉพาะ N วันล่าสุดของข้อมูล (นับจากวันล่าสุดในไฟล์ ไม่ใช่วันนี้) */
export function selectLastDays(rows, days) {
  const end = rows.reduce((max, r) => (r.datetime.slice(0, 10) > max ? r.datetime.slice(0, 10) : max), "");
  const start = addDays(end, -(days - 1));
  return { rows: rows.filter((r) => r.datetime.slice(0, 10) >= start), start, end };
}

/** จำนวนวันที่ต้องเลื่อน ให้วันล่าสุดของข้อมูลกลายเป็น "เมื่อวาน" (ไม่เลื่อนถอยหลัง) */
export function computeShift(lastDataDate, today) {
  return Math.max(0, daysBetween(lastDataDate, addDays(today, -1)));
}

/** เลื่อนวันที่ใน datetime โดยคงเวลาและ +07:00 ไว้ */
export function shiftDateTime(iso, days) {
  if (!days) return iso;
  return addDays(iso.slice(0, 10), days) + iso.slice(10);
}

/** แปลง 1 แถว CSV เป็น { id, data } สำหรับ Firestore */
export function toSaleDoc(row, shiftDays = 0) {
  const qty = Number(row.qty);
  const unit_price = Number(row.unit_price);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error(`qty ไม่ถูกต้อง: ${row.order_id} ${row.qty}`);
  if (!Number.isFinite(unit_price) || unit_price <= 0) throw new Error(`unit_price ไม่ถูกต้อง: ${row.order_id} ${row.unit_price}`);
  if (!BRANCHES.includes(row.branch)) throw new Error(`ชื่อสาขาไม่ถูกต้อง: ${row.order_id} "${row.branch}"`);
  if (!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\+07:00$/.test(row.datetime)) throw new Error(`datetime ไม่ถูกต้อง: ${row.order_id} ${row.datetime}`);

  const datetime = shiftDateTime(row.datetime, shiftDays);
  return {
    id: `${row.order_id}-${row.product_id}`, // รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ
    data: {
      order_id: row.order_id,
      datetime,
      date: datetime.slice(0, 10),
      hour: Number(datetime.slice(11, 13)),
      branch: row.branch,
      product_id: row.product_id,
      qty,
      unit_price,
      revenue: qty * unit_price,
      customer_id: row.customer_id ? row.customer_id : null,
      payment_method: row.payment_method,
      channel: row.channel,
      source: "import",
    },
  };
}

/** สรุปสำหรับตรวจหลังนำเข้า: จำนวนเอกสาร บิล ยอดขาย และยอดแยกสาขา */
export function summarize(docs) {
  const byBranch = {};
  let revenue = 0;
  const orders = new Set();
  let start = "9999", end = "";
  for (const { data: d } of docs) {
    revenue += d.revenue;
    orders.add(d.order_id);
    byBranch[d.branch] = (byBranch[d.branch] ?? 0) + d.revenue;
    if (d.date < start) start = d.date;
    if (d.date > end) end = d.date;
  }
  return { docs: docs.length, bills: orders.size, revenue, byBranch, start, end };
}
