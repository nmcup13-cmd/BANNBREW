import { useState } from "react";
import { BRANCHES, PAYMENTS, MAX_QTY, validateSaleForm, buildSale } from "./saleModel.js";
import { fmtBaht } from "../lib/metrics.js";

const EMPTY = { branch: "", product_id: "", qty: "1", payment_method: "QR พร้อมเพย์", customer_id: "" };

export default function SaleForm({ source, user, products }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // {type:'ok'|'error', text}
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const product = products.find((p) => p.product_id === form.product_id);
  const qty = Number(form.qty);

  async function submit(e) {
    e.preventDefault();
    const errs = validateSaleForm(form, products);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const sale = buildSale(form, product, { uid: user.uid });
    setBusy(true);
    setStatus(null);
    try {
      await source.addSale(sale);
      setStatus({ type: "ok", text: `บันทึกแล้ว ${sale.data.order_id} · ${fmtBaht(sale.data.revenue)}` });
      setForm((f) => ({ ...EMPTY, branch: f.branch, payment_method: f.payment_method })); // จำสาขาไว้
    } catch (err) {
      setStatus({
        type: "error",
        text: err?.code === "permission-denied"
          ? "ถูกปฏิเสธโดย Security Rules: ข้อมูลไม่ผ่านเงื่อนไข หรือยังไม่ได้ล็อกอิน"
          : `บันทึกไม่สำเร็จ: ${err?.message ?? err}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none";
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-xs text-red-700">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-5 ring-1 ring-stone-200" noValidate>
      <h2 className="text-lg font-semibold">บันทึกยอดขาย</h2>
      <p className="mb-3 text-sm text-stone-500">กดบันทึกแล้วดูกราฟทางซ้ายขยับเอง</p>

      <label className="block text-sm font-medium">สาขา
        <select className={field} value={form.branch} onChange={set("branch")}>
          <option value="">เลือกสาขา</option>
          {BRANCHES.map((b) => <option key={b}>{b}</option>)}
        </select>
      </label>
      <Err k="branch" />

      <label className="mt-3 block text-sm font-medium">เมนู
        <select className={field} value={form.product_id} onChange={set("product_id")}>
          <option value="">เลือกเมนู</option>
          {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name} · ฿{p.price}</option>)}
        </select>
      </label>
      <Err k="product_id" />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">จำนวน
          <input type="number" min="1" max={MAX_QTY} step="1" inputMode="numeric" className={field} value={form.qty} onChange={set("qty")} />
        </label>
        <label className="block text-sm font-medium">ชำระเงิน
          <select className={field} value={form.payment_method} onChange={set("payment_method")}>
            {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <Err k="qty" />

      <label className="mt-3 block text-sm font-medium">รหัสสมาชิก <span className="font-normal text-stone-400">(ไม่บังคับ)</span>
        <input className={field} placeholder="C01234" value={form.customer_id} onChange={set("customer_id")} />
      </label>
      <Err k="customer_id" />

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm text-stone-500">รวม</span>
        <span className="text-2xl font-semibold tabular-nums">
          {product && Number.isInteger(qty) && qty > 0 ? fmtBaht(product.price * qty) : "–"}
        </span>
      </div>
      <button disabled={busy} className="mt-3 w-full rounded-lg bg-emerald-700 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {busy ? "กำลังบันทึก…" : "บันทึกยอดขาย"}
      </button>
      {status && (
        <p className={`mt-3 text-sm ${status.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>{status.text}</p>
      )}
    </form>
  );
}
