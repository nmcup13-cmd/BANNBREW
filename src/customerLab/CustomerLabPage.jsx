// แท็บ "Lab ลูกค้า" · ซ่อมกราฟแย่ของข้อมูลลูกค้า (รูปแบบเดียวกับ src/lab2/Lab2Page.jsx)
// โหลด public/customers.csv + public/sales.csv เอง ไม่ต้องอัปโหลดไฟล์
import { useEffect, useState } from "react";
import * as Bad from "./BadCustomerCharts.jsx";
import * as Fixed from "./FixedCustomerCharts.jsx";
import { loadCustomerData } from "./customerMetrics.js";

// โจทย์ของแต่ละกราฟ: คำถามทางธุรกิจที่กราฟต้องตอบ + คำถามนำให้วิจารณ์
const CASES = [
  {
    n: 1, title: "สมาชิกตามช่วงอายุ",
    ask: "ฝ่ายการตลาดถาม: ลูกค้ากลุ่มอายุไหนมากที่สุด ควรทำสื่อให้ใคร",
    probe: ["ช่วงอายุเรียงตามลำดับจริงไหม \"ต่ำกว่า 18\" อยู่ตรงไหน", "ดูจากชิ้น pie บอกได้ไหมว่า 18-24 กับ 25-34 ต่างกันกี่คน"],
  },
  {
    n: 2, title: "สมาชิกใหม่รายเดือน",
    ask: "ผู้จัดการถาม: เดือนล่าสุดคนสมัครสมาชิกน้อยลงมาก ต้องเร่งแคมเปญไหม",
    probe: ["ข้อมูลเดือนล่าสุดมีถึงวันที่เท่าไร", "ถ้านับต่อวัน เดือนล่าสุดน้อยกว่าเดือนก่อนจริงไหม"],
  },
  {
    n: 3, title: "สมาชิกตามสาขาประจำ",
    ask: "เจ้าของร้านถาม: สาขาไหนหาสมาชิกใหม่ได้เก่งที่สุด สาขาไหนต้องปรับปรุง",
    probe: ["B01–B05 คือสาขาอะไร", "แกน Y เริ่มที่เท่าไร ดูด้วยตา B01 มากกว่า B03 กี่เท่า", "ทุกสาขาเปิดมานานเท่ากันไหม"],
  },
  {
    n: 4, title: "มูลค่าลูกค้าตามช่วงอายุ",
    ask: "ฝ่าย CRM ถาม: ลูกค้ากลุ่มไหนมีค่าที่สุด ควรให้สิทธิพิเศษก่อน",
    probe: ["ยอดรวมสูงเพราะแต่ละคนจ่ายเยอะ หรือเพราะกลุ่มนั้นมีคนเยอะ", "ถ้าคิดต่อคน อันดับเปลี่ยนไหม"],
  },
  {
    n: 5, title: "ความถี่การซื้อตามเพศ",
    ask: "ฝ่ายการตลาดถาม: ผู้หญิงซื้อบ่อยกว่าผู้ชายมาก ควรทำโปรฯ แยกเพศไหม",
    probe: ["แกน Y เริ่มที่เท่าไร", "ต่างกันจริงกี่ครั้งต่อคน คิดเป็นกี่ %", "สีชมพู/ฟ้าจำเป็นไหม"],
  },
];

function Placeholder({ n }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">
      <div className="text-lg font-medium">ยังไม่ได้ซ่อม</div>
      <div className="mt-1 text-sm">
        สร้าง <code className="rounded bg-stone-100 px-1">FixedCustomerChart{n}</code> ใน{" "}
        <code className="rounded bg-stone-100 px-1">src/customerLab/FixedCustomerCharts.jsx</code>
      </div>
    </div>
  );
}

export default function CustomerLabPage() {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadCustomerData()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: err.message }));
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") return <p className="text-stone-500">กำลังโหลดข้อมูลลูกค้า…</p>;
  if (state.status === "error") return <p className="text-red-700">โหลดข้อมูลไม่สำเร็จ: {state.message}</p>;
  const { data } = state;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Lab ลูกค้า · ซ่อมกราฟแย่</h1>
        <p className="mt-1 max-w-3xl text-stone-600">
          กราฟซ้ายมือใช้ข้อมูลลูกค้า {data.members.length.toLocaleString("th-TH")} คนที่ถูกต้อง แต่ทำให้คนดูเข้าใจผิดหรืออ่านไม่ออก
          ทางขวามือคือกราฟที่ซ่อมแล้วให้ตอบคำถามทางธุรกิจได้ตรงกว่า
        </p>
      </header>

      {CASES.map((c) => {
        const BadC = Bad[`BadCustomerChart${c.n}`];
        const FixC = Fixed[`FixedCustomerChart${c.n}`];
        return (
          <section key={c.n} id={`customer-case-${c.n}`} className="mb-8 rounded-xl bg-white p-5 ring-1 ring-stone-200">
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
                  <BadC data={data} />
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm font-semibold text-emerald-700">หลังซ่อม</div>
                <div className="h-80 overflow-hidden rounded-lg bg-stone-50 p-2">
                  {FixC ? <FixC data={data} /> : <Placeholder n={c.n} />}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
