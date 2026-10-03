// Lab 3.2B · Dashboard ยอดขายแบบ real-time จาก Firestore (+ ฟอร์ม 3.2C ทางขวา)
// คำนวณด้วย computeMetrics จาก Lab 1 เหมือนหน้า Dashboard (ไม่เขียนสูตรใหม่)
// แค่แปลงเอกสาร Firestore ให้เป็นรูปแบบแถวที่ metrics.js ใช้ (total, orderId, product)
// Lab 3.3A · ต้องล็อกอินด้วย Google ก่อน ถ้ายังไม่ล็อกอินจะไม่เริ่ม onSnapshot เลย
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider, projectId } from "./firebase.js";
import { addDays, todayBangkok } from "./time.js";
import { computeMetrics, baht, thaiDate } from "../lib/metrics";
import KpiCard from "../components/KpiCard.jsx";
import ChartCard from "../components/ChartCard.jsx";
import { DailySalesChart, HourlySalesChart, TopProductsChart } from "../components/charts.jsx";
import SaleForm from "./SaleForm.jsx";

const RANGES = [
  { id: "today", label: "วันนี้", days: 1 },
  { id: "7d", label: "7 วัน", days: 7 },
  { id: "30d", label: "30 วัน", days: 30 },
];
const HIGHLIGHT_MS = 4000;

const errorText = (e) =>
  e.code === "permission-denied" ? "Security Rules ไม่อนุญาตให้อ่านข้อมูลนี้"
  : e.code === "failed-precondition" ? `ต้องสร้าง index ก่อน: ${e.message}`
  : e.code === "resource-exhausted" ? "ใช้โควตาฟรีวันนี้หมดแล้ว ลองเลือกช่วงวันที่สั้นลงหรือรอพรุ่งนี้"
  : e.code === "unavailable" ? "เชื่อมต่อ Firestore ไม่ได้ ตรวจอินเทอร์เน็ต"
  : `เกิดข้อผิดพลาด: ${e.message}`;

const authErrorText = (e) =>
  e.code === "auth/unauthorized-domain" ? `โดเมน ${location.hostname} ยังไม่ได้รับอนุญาต เพิ่มใน Authentication → Settings → Authorized domains`
  : e.code === "auth/operation-not-allowed" ? "ยังไม่ได้เปิดล็อกอินด้วย Google ใน Authentication → Sign-in method"
  : e.code === "auth/popup-blocked" ? "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน อนุญาต pop-up ให้เว็บนี้แล้วลองใหม่"
  : e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request" ? "ปิดหน้าต่างล็อกอินก่อนเสร็จ ลองกดเข้าสู่ระบบอีกครั้ง"
  : `เข้าสู่ระบบไม่สำเร็จ: ${e.message}`;

export default function LiveTab() {
  const [user, setUser] = useState(undefined); // undefined = กำลังตรวจ, null = ยังไม่ล็อกอิน
  const [authError, setAuthError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const signIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setAuthError(authErrorText(e));
    } finally {
      setSigningIn(false);
    }
  };

  if (user === undefined) return <p className="text-stone-500">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-amber-900">ยอดขายสด · Firestore</h2>
        <p className="mt-2 text-sm text-stone-500">ต้องเข้าสู่ระบบก่อนจึงจะดูและบันทึกยอดขายได้</p>
        <button onClick={signIn} disabled={signingIn}
                className="mt-5 w-full rounded-lg bg-purple-700 px-4 py-2.5 font-medium text-white hover:bg-purple-800 disabled:opacity-50">
          {signingIn ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบด้วย Google"}
        </button>
        {authError && <p className="mt-3 text-sm text-red-700">❌ {authError}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
        <span className="min-w-0 truncate text-sm text-stone-700">{user.displayName ?? user.email}</span>
        <button onClick={() => signOut(auth)}
                className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50">
          ออกจากระบบ
        </button>
      </div>
      <LiveDashboard user={user} />
    </div>
  );
}

function LiveDashboard({ user }) {
  const [rangeId, setRangeId] = useState("7d");
  const [branch, setBranch] = useState("all");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reads, setReads] = useState(0);
  const [fresh, setFresh] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState(null);
  const timers = useRef([]);

  const range = RANGES.find((r) => r.id === rangeId);
  const chooseRange = (id) => {
    if (id === rangeId) return;
    setRangeId(id);
    setLoading(true);
    setError(null);
    setFresh(new Set());
  };
  const end = todayBangkok();
  const start = addDays(end, -(range.days - 1));

  // เมนูโหลดครั้งเดียว (ใช้ทั้งชื่อเมนูในตารางและในฟอร์ม)
  useEffect(() => {
    getDocs(collection(db, "products"))
      .then((snap) => {
        setReads((n) => n + snap.size);
        setProducts(snap.docs.map((d) => d.data()).sort((a, b) => a.product_id.localeCompare(b.product_id)));
      })
      .catch((e) => setProductsError(errorText(e)));
  }, []);

  // ฟังยอดขายในช่วงวันที่ที่เลือกแบบ real-time
  useEffect(() => {
    let first = true;
    const q = query(collection(db, "sales"), where("date", ">=", start), where("date", "<=", end), orderBy("date"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const changes = snap.docChanges();
        setReads((n) => n + changes.length);
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        if (!first) {
          const added = changes.filter((c) => c.type === "added").map((c) => c.doc.id);
          if (added.length) {
            setFresh((s) => new Set([...s, ...added]));
            timers.current.push(setTimeout(() => {
              setFresh((s) => { const next = new Set(s); added.forEach((id) => next.delete(id)); return next; });
            }, HIGHLIGHT_MS));
          }
        }
        first = false;
      },
      (e) => { setError(errorText(e)); setLoading(false); },
    );
    return unsubscribe;
  }, [start, end]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const names = useMemo(() => new Map(products.map((p) => [p.product_id, p.product_name])), [products]);

  // แปลงเอกสาร Firestore → แถวแบบที่ computeMetrics (Lab 1) ใช้
  const rows = useMemo(
    () => docs.map((d) => ({
      orderId: d.order_id, total: d.revenue, qty: d.qty,
      product: names.get(d.product_id) ?? d.product_id, branch: d.branch, date: d.date, hour: d.hour,
    })),
    [docs, names],
  );
  const filteredRows = useMemo(() => (branch === "all" ? rows : rows.filter((r) => r.branch === branch)), [rows, branch]);
  const all = useMemo(() => computeMetrics(rows), [rows]);
  const m = useMemo(() => computeMetrics(filteredRows), [filteredRows]);

  const latest = useMemo(
    () => docs.filter((d) => branch === "all" || d.branch === branch)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
      .slice(0, 8),
    [docs, branch],
  );

  const btn = (active) =>
    `rounded-md px-3 py-1 text-sm ${active ? "bg-purple-700 text-white" : "text-stone-600 hover:bg-stone-50"}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-amber-900">ยอดขายสด · Firestore</h2>
            <p className="text-sm text-stone-500">
              โปรเจกต์ {projectId} · {products.length ? `พบเมนู ${products.length} รายการ` : "กำลังโหลดเมนู…"} ·
              อ่านเอกสารไปแล้ว {reads.toLocaleString("th-TH")} ครั้ง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex rounded-lg border border-stone-300 bg-white p-0.5">
              {RANGES.map((r) => (
                <button key={r.id} onClick={() => chooseRange(r.id)} className={btn(r.id === rangeId)}>{r.label}</button>
              ))}
            </nav>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900">
              <option value="all">ทุกสาขา</option>
              {all.byBranch.map((b) => <option key={b.branch} value={b.branch}>{b.branch}</option>)}
            </select>
          </div>
        </div>

        <p className="text-sm text-stone-500">
          {thaiDate(start, { day: "numeric", month: "short", year: "numeric" })}
          {start !== end && ` – ${thaiDate(end, { day: "numeric", month: "short", year: "numeric" })}`} ·{" "}
          {filteredRows.length.toLocaleString("th-TH")} รายการ
        </p>

        {productsError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">❌ โหลดเมนูไม่ได้: {productsError}</p>}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">❌ {error}</p>}
        {loading && !error && <p className="text-stone-500">กำลังโหลดยอดขาย…</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <KpiCard label="ยอดขายรวม" value={baht(m.totalSales)} />
              <KpiCard label="จำนวนบิล" value={m.orders.toLocaleString("th-TH")} note={`${m.itemsSold.toLocaleString("th-TH")} แก้ว/ชิ้น`} />
              <KpiCard label="ยอดเฉลี่ยต่อบิล" value={baht(m.avgPerOrder)} />
              <KpiCard label="วันที่ขายดีที่สุด" value={m.bestDay ? thaiDate(m.bestDay.date) : "–"} note={m.bestDay && baht(m.bestDay.sales)} />
            </div>

            {rangeId === "today" ? (
              <ChartCard title="ยอดขายวันนี้รายชั่วโมง" subtitle="บาท">
                {m.hourly.length ? <HourlySalesChart data={m.hourly} /> : <p className="text-sm text-stone-500">วันนี้ยังไม่มียอดขาย</p>}
              </ChartCard>
            ) : (
              <ChartCard title="ยอดขายรายวัน" subtitle="บาท · วันสุดท้ายคือวันนี้ ซึ่งยังขายไม่จบวัน">
                <DailySalesChart data={m.daily} />
              </ChartCard>
            )}

            {all.byBranch.length > 0 && (
              <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
                <h2 className="font-semibold text-stone-900">ยอดขายตามสาขา</h2>
                <p className="text-sm text-stone-500">ทุกสาขาในช่วงที่เลือก · ไม่ขึ้นกับตัวกรองสาขา</p>
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {all.byBranch.map((b) => (
                      <tr key={b.branch} className="border-t border-stone-100">
                        <td className="py-1.5">{b.branch}</td>
                        <td className="py-1.5 text-right tabular-nums">{baht(b.sales)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-stone-300 font-semibold">
                      <td className="py-1.5">รวม</td>
                      <td className="py-1.5 text-right tabular-nums">{baht(all.totalSales)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {m.topProducts.length > 0 && (
              <ChartCard title="เมนูขายดี 8 อันดับ" subtitle="เรียงตามยอดขาย (บาท)">
                <TopProductsChart data={m.topProducts} />
              </ChartCard>
            )}

            <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
              <h2 className="font-semibold text-stone-900">รายการล่าสุด</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-left text-stone-500">
                    <tr><th className="py-1.5 font-normal">เวลา</th><th className="font-normal">สาขา</th><th className="font-normal">เมนู</th><th className="text-right font-normal">จำนวน</th><th className="text-right font-normal">ยอด</th></tr>
                  </thead>
                  <tbody>
                    {latest.map((d) => (
                      <tr key={d.id} className={`border-t border-stone-100 transition-colors duration-700 ${fresh.has(d.id) ? "bg-amber-100" : ""}`}>
                        <td className="py-1.5 tabular-nums">{thaiDate(d.date, { day: "numeric", month: "short" })} {d.datetime.slice(11, 16)}</td>
                        <td>{d.branch}</td>
                        <td>{names.get(d.product_id) ?? d.product_id}</td>
                        <td className="text-right tabular-nums">{d.qty}</td>
                        <td className="text-right tabular-nums">{baht(d.revenue)}</td>
                      </tr>
                    ))}
                    {!latest.length && <tr><td colSpan={5} className="py-3 text-stone-500">ยังไม่มีรายการในช่วงนี้</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <SaleForm products={products} uid={user.uid} />
      </aside>
    </div>
  );
}
