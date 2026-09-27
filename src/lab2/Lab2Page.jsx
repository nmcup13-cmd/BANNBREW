import { useEffect, useState } from "react";
import Papa from "papaparse";
import * as Bad from "./BadCharts.jsx";
import * as Fixed from "./FixedCharts.jsx";

// โหลดข้อมูลของ Lab 2.2 เอง จาก public/sales_clean.csv แล้วแปลงเป็น { date, branch, product_id, revenue }
function useLab2Rows() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    fetch("/sales_clean.csv")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(
        (text) =>
          new Promise((resolve) => {
            Papa.parse(text, {
              header: true,
              skipEmptyLines: "greedy",
              transformHeader: (h) => h.replace(/^﻿/, "").trim().toLowerCase(),
              complete: ({ data }) => resolve(data),
            });
          })
      )
      .then((data) => {
        if (cancelled) return;
        const parsed = data
          .map((r) => ({
            date: String(r.datetime ?? "").slice(0, 10),
            branch: r.branch,
            product_id: r.product_id,
            revenue: Number(r.qty) * Number(r.unit_price),
          }))
          .filter((r) => r.date && r.branch && r.product_id && Number.isFinite(r.revenue));
        setRows(parsed);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, status };
}

// โจทย์ของแต่ละกราฟ: คำถามทางธุรกิจที่กราฟต้องตอบ + คำถามนำให้วิจารณ์
const CASES = [
  {
    n: 1, title: "สัดส่วนยอดขายแต่ละเมนู",
    ask: "ผู้จัดการฝ่ายเมนูถาม: เมนูไหนทำเงินมากที่สุด ควรโปรโมตตัวไหน",
    probe: ["บอกได้ไหมว่าเมนูอันดับ 3 คืออะไร", "สีใช้แยกอะไร จำได้ไหมว่าสีไหนคือเมนูไหน"],
  },
  {
    n: 2, title: "ยอดขายแยกสาขา",
    ask: "เจ้าของร้านถาม: สาขาต่าง ๆ ขายได้ต่างกันมากแค่ไหน",
    probe: ["ดูด้วยตา สยามขายได้กี่เท่าของอารีย์", "ลองเทียบกับตัวเลขจริงใน Tooltip"],
  },
  {
    n: 3, title: "ยอดขายรายวัน",
    ask: "เจ้าของร้านถาม: ยอดขายโดยรวมโตขึ้นหรือลดลง",
    probe: ["เห็นแนวโน้มชัดไหม หรือเห็นแต่ความยุ่ง", "อ่านวันที่บนแกนได้ไหม"],
  },
  {
    n: 4, title: "ยอดขายรายเดือน",
    ask: "ผู้บริหารถาม: ทำไมเดือนล่าสุดยอดตก ต้องทำโปรฯ ด่วนไหม",
    probe: ["ข้อมูลเดือนล่าสุดมีกี่วัน (ดูใน README ของข้อมูล)", "ถ้าเดือนนี้ขายครบทั้งเดือนจะได้ประมาณเท่าไร"],
  },
  {
    n: 5, title: "ผลงานผู้จัดการสาขา",
    ask: "ฝ่ายบุคคลถาม: ผู้จัดการสาขาไหนควรได้รับการพัฒนาเร่งด่วน",
    probe: ["ทุกสาขาเปิดขายมานานเท่ากันไหม (ดู branches.csv)", "การเทียบแบบนี้ยุติธรรมกับผู้จัดการทุกคนไหม"],
  },
];

function Placeholder({ n }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">
      <div className="text-lg font-medium">ยังไม่ได้ซ่อม</div>
      <div className="mt-1 text-sm">
        สร้าง <code className="rounded bg-stone-100 px-1">FixedChart{n}</code> ใน <code className="rounded bg-stone-100 px-1">src/lab2/FixedCharts.jsx</code>
      </div>
    </div>
  );
}

export default function Lab2Page() {
  const { rows, status } = useLab2Rows();
  const products = [];

  if (status === "loading") return <p className="text-stone-500">กำลังโหลดข้อมูล…</p>;
  if (status === "error") return <p className="text-red-700">โหลด /sales_clean.csv ไม่สำเร็จ</p>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Lab 2.2 · ซ่อมกราฟแย่</h1>
        <p className="mt-1 max-w-3xl text-stone-600">
          กราฟซ้ายมือทุกอันใช้ข้อมูลถูกต้อง แต่ทำให้คนดูเข้าใจผิดหรืออ่านไม่ออก วิจารณ์ลงใน LAB2_WORKSHEET.md
          แล้วสั่ง AI สร้างกราฟที่ตอบคำถามได้ดีกว่าทางขวามือ
        </p>
      </header>

      {CASES.map((c) => {
        const BadC = Bad[`BadChart${c.n}`];
        const FixC = Fixed[`FixedChart${c.n}`];
        return (
          <section key={c.n} id={`case-${c.n}`} className="mb-8 rounded-xl bg-white p-5 ring-1 ring-stone-200">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="rounded-full bg-stone-900 px-3 py-0.5 text-sm font-semibold text-white">กราฟ {c.n}</span>
              <h2 className="text-xl font-semibold">{c.title}</h2>
            </div>
            <p className="mt-2 font-medium text-stone-800">{c.ask}</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-stone-500">
              {c.probe.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-semibold text-red-700">ก่อนซ่อม</div>
                <div className="h-80 overflow-hidden rounded-lg bg-stone-50 p-2">
                  <BadC rows={rows} products={products} />
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm font-semibold text-emerald-700">หลังซ่อม</div>
                <div className="h-80 overflow-hidden rounded-lg bg-stone-50 p-2">
                  {FixC ? <FixC rows={rows} products={products} /> : <Placeholder n={c.n} />}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
