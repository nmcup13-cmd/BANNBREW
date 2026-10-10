// Lab 3.2 · Dashboard แบบ real-time
// จุดสำคัญ: ใช้ฟังก์ชันคำนวณเดิมจาก Lab 1 (src/lib/metrics.js) ได้ทันที
// เพราะเอกสารใน Firestore มีฟิลด์เดียวกับ sales.csv เปลี่ยนแค่ "แหล่งข้อมูล" ไม่ต้องเขียนสูตรใหม่
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import KpiCard from "../components/KpiCard.jsx";
import { prepareRows, computeKpis, dailyRevenue, revenueByBranch, fmtBaht, fmtBaht2, fmtNum, fmtShortBaht } from "../lib/metrics.js";
import { todayBangkok, addDays } from "./time.js";
import { BRANCHES } from "./saleModel.js";
import SaleForm from "./SaleForm.jsx";
import { LoginCard, UserChip, authErrorText } from "./AuthBar.jsx";

const MAIN = "#2F7D5B";
const PRESETS = [
  { id: "today", label: "วันนี้", days: 1 },
  { id: "7d", label: "7 วัน", days: 7 },
  { id: "30d", label: "30 วัน", days: 30 },
];
const FREE_READS_PER_DAY = 50_000; // โควตาฟรีโดยประมาณ ตรวจตัวเลขล่าสุดในหน้า pricing ของ Firebase

const shortDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });

function hourlyRevenue(rows) {
  const by = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0 }));
  for (const r of rows) by[r.hour].revenue += r.revenue;
  return by.filter((h) => h.hour >= 7 && h.hour <= 21);
}

export default function LiveTab({ source }) {
  const [user, setUser] = useState(undefined); // undefined = กำลังตรวจสถานะ
  const [authError, setAuthError] = useState(null);
  const [products, setProducts] = useState([]);
  const [preset, setPreset] = useState("7d");
  const [branch, setBranch] = useState("");
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);
  const [fresh, setFresh] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const readsRef = useRef(0);
  const [reads, setReads] = useState(0);

  // 1) สถานะล็อกอิน
  useEffect(() => source.onAuth(setUser), [source]);

  // 2) รายการเมนู (อ่านครั้งเดียว)
  useEffect(() => {
    if (!user) return;
    source.loadProducts().then(setProducts).catch((e) => setError(e.message));
  }, [source, user]);

  // 3) ฟังยอดขายแบบ real-time · เปลี่ยนช่วงวันที่ = เลิกฟังอันเก่า แล้วฟังอันใหม่
  const range = useMemo(() => {
    const end = todayBangkok();
    const days = PRESETS.find((p) => p.id === preset).days;
    return { start: addDays(end, -(days - 1)), end };
  }, [preset]);

  useEffect(() => {
    if (!user) return;
    setDocs(null);
    setError(null);
    const unsubscribe = source.subscribeSales(
      range,
      (list, meta) => {
        setDocs(list);
        setConnected(!meta.fromCache);
        readsRef.current += meta.received;
        setReads(readsRef.current);
        if (meta.added.length) {
          setFresh((s) => new Set([...s, ...meta.added]));
          setTimeout(() => setFresh((s) => { const n = new Set(s); meta.added.forEach((id) => n.delete(id)); return n; }), 4000);
        }
      },
      (err) => {
        setError(err.code === "permission-denied"
          ? "อ่านข้อมูลไม่ได้: Security Rules ไม่อนุญาต (ล็อกอินแล้วหรือยัง? rules ถูกต้องไหม?)"
          : err.code === "failed-precondition" ? `ต้องสร้าง index ก่อน: ${err.message}` : err.message);
        setConnected(false);
      }
    );
    return () => unsubscribe(); // สำคัญ: ไม่ cleanup = ฟังซ้อนกันหลายอัน อ่านข้อมูลซ้ำจนโควตาหมด
  }, [source, user, range]);

  const rows = useMemo(() => {
    if (!docs) return null;
    const all = prepareRows(docs);
    return branch ? all.filter((r) => r.branch === branch) : all;
  }, [docs, branch]);
  const kpis = useMemo(() => rows && computeKpis(rows), [rows]);
  const trend = useMemo(() => rows && (preset === "today" ? hourlyRevenue(rows) : dailyRevenue(rows)), [rows, preset]);
  const branches = useMemo(() => rows && revenueByBranch(rows), [rows]);
  const recent = useMemo(() => docs && [...docs]
    .filter((d) => !branch || d.branch === branch)
    .sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, 8), [docs, branch]);
  const productName = useMemo(() => Object.fromEntries(products.map((p) => [p.product_id, p.product_name])), [products]);

  const signIn = () => { setAuthError(null); source.signIn().catch((e) => setAuthError(authErrorText(e))); };

  if (user === undefined) return <p className="text-stone-500">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;
  if (!user) return <LoginCard onSignIn={signIn} error={authError} />;

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#6B3E26" }}>ยอดขายสด</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-stone-400"}`} />
            {connected ? "เชื่อมต่อแบบ real-time" : "กำลังเชื่อมต่อ…"}
            {source.mode === "demo" && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">โหมดสาธิต ไม่ใช่ Firebase จริง</span>}
          </p>
        </div>
        <UserChip user={user} onSignOut={() => source.signOut()} />
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => setPreset(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${preset === p.id ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}>
            {p.label}
          </button>
        ))}
        <select value={branch} onChange={(e) => setBranch(e.target.value)}
                className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-stone-200">
          <option value="">ทุกสาขา</option>
          {BRANCHES.map((b) => <option key={b}>{b}</option>)}
        </select>
        <span className="text-sm text-stone-500">{shortDate(range.start)} – {shortDate(range.end)}</span>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!rows ? <p className="text-stone-500">กำลังโหลดยอดขาย…</p> : rows.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-stone-500 ring-1 ring-stone-200">
              ยังไม่มียอดขายในช่วงนี้ ลองบันทึกยอดขายจากฟอร์มด้านขวา หรือเลือกช่วง 7 วัน
            </p>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <KpiCard label="ยอดขาย" value={fmtBaht(kpis.revenue)} />
                <KpiCard label="จำนวนบิล" value={fmtNum(kpis.bills)} />
                <KpiCard label="เฉลี่ยต่อบิล" value={fmtBaht2(kpis.avgPerBill)} />
                <KpiCard label="ลูกค้าสมาชิก" value={fmtNum(kpis.customers)} />
              </section>

              <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
                <h2 className="mb-3 text-lg font-semibold">{preset === "today" ? "ยอดขายรายชั่วโมง วันนี้" : "ยอดขายรายวัน"}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {preset === "today" ? (
                      <BarChart data={trend}>
                        <CartesianGrid vertical={false} stroke="#eee" />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={fmtShortBaht} width={56} tick={{ fontSize: 12 }} />
                        <Tooltip labelFormatter={(h) => `${h}:00–${h}:59`} formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
                        <Bar dataKey="revenue" fill={MAIN} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    ) : (
                      <LineChart data={trend}>
                        <CartesianGrid vertical={false} stroke="#eee" />
                        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={30} tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={fmtShortBaht} width={56} domain={[0, "auto"]} tick={{ fontSize: 12 }} />
                        <Tooltip labelFormatter={shortDate} formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
                        <Line dataKey="revenue" stroke={MAIN} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>

              {!branch && (
                <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
                  <h2 className="mb-3 text-lg font-semibold">ยอดขายแยกสาขา</h2>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branches} layout="vertical" margin={{ right: 70 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="branch" width={90} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
                        <Bar dataKey="revenue" fill={MAIN} radius={[0, 3, 3, 0]} isAnimationActive={false}>
                          <LabelList dataKey="revenue" position="right" formatter={fmtBaht} style={{ fontSize: 12, fill: "#44403c" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
                <h2 className="mb-2 text-lg font-semibold">รายการล่าสุด</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-left text-stone-500">
                      <tr><th className="py-1.5 pr-3 font-medium">เวลา</th><th className="pr-3 font-medium">สาขา</th><th className="pr-3 font-medium">เมนู</th><th className="pr-3 text-right font-medium">จำนวน</th><th className="text-right font-medium">ยอด</th></tr>
                    </thead>
                    <tbody>
                      {recent.map((d) => (
                        <tr key={d.id} className={`border-t border-stone-100 transition-colors duration-1000 ${fresh.has(d.id) ? "bg-amber-100" : ""}`}>
                          <td className="py-1.5 pr-3 tabular-nums">{d.datetime.slice(5, 10).split("-").reverse().join("/")} {d.datetime.slice(11, 16)}</td>
                          <td className="pr-3">{d.branch}</td>
                          <td className="pr-3">{productName[d.product_id] ?? d.product_id}{d.source === "web" && <span className="ml-1 rounded bg-emerald-50 px-1 text-xs text-emerald-700">เว็บ</span>}</td>
                          <td className="pr-3 text-right tabular-nums">{d.qty}</td>
                          <td className="text-right tabular-nums">{d._pending ? <span className="italic text-stone-400">กำลังบันทึก…</span> : fmtBaht(d.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <p className="text-xs text-stone-500">
            อ่านเอกสารจาก Firestore ไปแล้วประมาณ {fmtNum(reads)} ครั้งตั้งแต่เปิดหน้านี้ (โควตาฟรีราว {fmtNum(FREE_READS_PER_DAY)} ครั้งต่อวันต่อโปรเจกต์)
            · เปลี่ยนช่วงเป็น 30 วันจะอ่านเยอะกว่า 7 วันหลายเท่า
          </p>
        </div>

        <aside className="lg:sticky lg:top-16 lg:self-start">
          <SaleForm source={source} user={user} products={products} />
        </aside>
      </div>
    </div>
  );
}
