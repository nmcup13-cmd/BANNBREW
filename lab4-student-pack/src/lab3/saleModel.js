// Lab 3.2 · ตรวจฟอร์มและสร้างเอกสารยอดขายใหม่
// ต้องผ่าน src/lab3/saleModel.test.js (npm test)
// เอกสารที่ได้ต้องมีโครงสร้างเดียวกับข้อมูลที่ import ใน Lab 3.1 เพื่อให้ metrics.js จาก Lab 1 ใช้ต่อได้ทันที
import { nowBangkokISO } from "./time.js";

export const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];
export const PAYMENTS = ["QR พร้อมเพย์", "บัตรเครดิต", "เงินสด", "LINE MAN", "Grab"];
const DELIVERY = ["LINE MAN", "Grab"];
export const MAX_QTY = 20;

/** คืน object ของข้อผิดพลาด { field: ข้อความ } ถ้าไม่มีข้อผิดพลาดคืน {} */
export function validateSaleForm(form, products) {
  const errors = {};
  if (!BRANCHES.includes(form.branch)) errors.branch = "เลือกสาขา";
  if (!products.some((p) => p.product_id === form.product_id)) errors.product_id = "เลือกเมนู";
  const qty = Number(form.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) errors.qty = `จำนวนต้องเป็นจำนวนเต็ม 1–${MAX_QTY}`;
  if (!PAYMENTS.includes(form.payment_method)) errors.payment_method = "เลือกวิธีชำระเงิน";
  const cid = (form.customer_id ?? "").trim().toUpperCase();
  if (cid && !/^C\d{5}$/.test(cid)) errors.customer_id = "รหัสสมาชิกต้องเป็น C ตามด้วยเลข 5 หลัก เช่น C01234";
  return errors;
}

/** สร้างเลขบิลจากเวลาไทย เช่น WEB-20260927-140509-K3F9 */
export function makeOrderId(now = new Date(), rand = Math.random) {
  const t = nowBangkokISO(now);
  const stamp = `${t.slice(0, 10).replaceAll("-", "")}-${t.slice(11, 19).replaceAll(":", "")}`;
  const suffix = Math.floor(rand() * 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `WEB-${stamp}-${suffix}`;
}

/**
 * สร้าง { id, data } จากฟอร์มที่ผ่านการตรวจแล้ว
 * ราคาใช้จาก products เสมอ ไม่รับจากผู้ใช้ · created_at ใส่ทีหลังด้วย serverTimestamp()
 */
export function buildSale(form, product, { uid, now = new Date(), rand = Math.random }) {
  const qty = Number(form.qty);
  const datetime = nowBangkokISO(now);
  const order_id = makeOrderId(now, rand);
  const cid = (form.customer_id ?? "").trim().toUpperCase();
  return {
    id: `${order_id}-${product.product_id}`,
    data: {
      order_id,
      datetime,
      date: datetime.slice(0, 10),
      hour: Number(datetime.slice(11, 13)),
      branch: form.branch,
      product_id: product.product_id,
      qty,
      unit_price: Number(product.price),
      revenue: qty * Number(product.price),
      customer_id: cid || null,
      payment_method: form.payment_method,
      channel: DELIVERY.includes(form.payment_method) ? "เดลิเวอรี" : "หน้าร้าน",
      source: "web",
      created_by: uid,
    },
  };
}
