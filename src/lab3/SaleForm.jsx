// Lab 3.2C · ฟอร์มบันทึกยอดขาย (วางไว้คอลัมน์ขวาของ LiveTab)
// ตรวจด้วย validateSaleForm และสร้างเอกสารด้วย buildSale เพื่อให้โครงสร้างเหมือนข้อมูลที่ import
import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { BRANCHES, PAYMENTS, MAX_QTY, validateSaleForm, buildSale } from "./saleModel.js";
import { baht } from "../lib/metrics";

const EMPTY = { branch: BRANCHES[0], product_id: "", qty: "1", payment_method: PAYMENTS[0], customer_id: "" };

const inputCls =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200";

function Field({ label, error, children }) {
  return (
    <label className="block text-sm text-stone-600">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

export default function SaleForm({ products, uid = "anonymous" }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { ok: boolean, text }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const product = products.find((p) => p.product_id === form.product_id);
  const qty = Number(form.qty);
  const total = product && Number.isInteger(qty) && qty > 0 ? qty * product.price : null;

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const errs = validateSaleForm(form, products);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const { id, data } = buildSale(form, product, { uid });
      await setDoc(doc(db, "sales", id), { ...data, created_at: serverTimestamp() });
      setMessage({ ok: true, text: `✅ บันทึกบิล ${data.order_id} แล้ว ${baht(data.revenue)}` });
      setForm((f) => ({ ...f, qty: "1", customer_id: "" }));
    } catch (err) {
      setMessage({
        ok: false,
        text: err.code === "permission-denied" ? "❌ ถูกปฏิเสธโดย Security Rules" : `❌ บันทึกไม่สำเร็จ: ${err.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold text-stone-900">บันทึกยอดขาย</h2>

      <Field label="สาขา" error={errors.branch}>
        <select value={form.branch} onChange={set("branch")} className={inputCls}>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>

      <Field label="เมนู" error={errors.product_id}>
        <select value={form.product_id} onChange={set("product_id")} className={inputCls}>
          <option value="">— เลือกเมนู —</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>{p.product_name} · {baht(p.price)}</option>
          ))}
        </select>
      </Field>

      <Field label={`จำนวน (1–${MAX_QTY})`} error={errors.qty}>
        <input type="number" inputMode="numeric" min="1" max={MAX_QTY} step="1"
               value={form.qty} onChange={set("qty")} className={inputCls} />
      </Field>

      <Field label="วิธีชำระเงิน" error={errors.payment_method}>
        <select value={form.payment_method} onChange={set("payment_method")} className={inputCls}>
          {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="รหัสสมาชิก (ไม่บังคับ)" error={errors.customer_id}>
        <input value={form.customer_id} onChange={set("customer_id")} placeholder="เช่น C01234" className={inputCls} />
      </Field>

      <div className="flex items-baseline justify-between border-t border-stone-200 pt-3">
        <span className="text-sm text-stone-500">ยอดรวม</span>
        <span className="text-2xl font-bold tabular-nums text-stone-900">{total === null ? "–" : baht(total)}</span>
      </div>

      <button type="submit" disabled={saving || !products.length}
              className="w-full rounded-lg bg-purple-700 px-4 py-2 font-medium text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? "กำลังบันทึก…" : "บันทึก"}
      </button>

      {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>}
    </form>
  );
}
