import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import UploadZone from './components/UploadZone'
import KpiCard from './components/KpiCard'
import ChartCard from './components/ChartCard'
import { DailySalesChart, TopProductsChart, HourlySalesChart } from './components/charts'
import { parseSalesFile } from './lib/parseSales'
import { computeMetrics, baht, thaiDate } from './lib/metrics'
import Lab2Page from './lab2/Lab2Page.jsx'
import CustomersPage from './customers/CustomersPage.jsx'
import CustomerLabPage from './customerLab/CustomerLabPage.jsx'
import LiveTab from './lab3/LiveTab.jsx'
import RulesTester from './lab3/RulesTester.jsx'
import SetupGuide from './lab3/SetupGuide.jsx'
import { isConfigured } from './lab3/firebase.js'

export default function App() {
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [branch, setBranch] = useState('all') // 'all' = ทุกสาขา
  const [view, setView] = useState('dashboard') // 'dashboard' | 'customers' | 'lab2' | 'customerLab' | 'live' | 'rules'
  const [products, setProducts] = useState([])

  // รายชื่อเมนู (product_id → product_name) จาก public/products.csv ใช้ในหน้า Lab 2.2
  useEffect(() => {
    fetch('/products.csv')
      .then((res) => (res.ok ? res.text() : ''))
      .then((csv) => setProducts(Papa.parse(csv, { header: true, skipEmptyLines: true }).data))
      .catch(() => setProducts([]))
  }, [])

  // ภาพรวมทุกสาขา + รายชื่อสาขาสำหรับ dropdown
  const allMetrics = useMemo(() => computeMetrics(rows), [rows])
  const branches = allMetrics.byBranch.map((b) => b.branch)

  // กรองแถวตามสาขาที่เลือก แล้วคำนวณ KPI/กราฟจากแถวที่กรองแล้ว
  const filteredRows = useMemo(
    () => (branch === 'all' ? rows : rows.filter((r) => (r.branch ?? 'ไม่ระบุ') === branch)),
    [rows, branch],
  )
  const m = useMemo(
    () => (branch === 'all' ? allMetrics : computeMetrics(filteredRows)),
    [branch, allMetrics, filteredRows],
  )

  // แปลงแถวให้เป็นรูปแบบที่ไฟล์ใน src/lab2 ใช้ (product_id, branch, revenue, date, hour)
  const lab2Rows = useMemo(
    () => rows.map((r) => ({
      product_id: r.product, branch: r.branch ?? 'ไม่ระบุ', revenue: r.total, date: r.date, hour: r.hour,
    })),
    [rows],
  )

  const load = async (file, name) => {
    setLoading(true)
    try {
      const result = await parseSalesFile(file)
      setRows(result.rows)
      setBranch('all')
      setErrors(result.errors)
      setFileName(name)
    } catch (err) {
      setErrors([`อ่านไฟล์ไม่สำเร็จ: ${err.message}`])
    } finally {
      setLoading(false)
    }
  }

  const loadSample = async () => {
    try {
      const res = await fetch('/sample-sales.csv')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      load(await res.text(), 'sample-sales.csv (ข้อมูลตัวอย่าง)')
    } catch (err) {
      setErrors([`โหลดข้อมูลตัวอย่างไม่สำเร็จ: ${err.message}`])
    }
  }

  const reset = () => {
    setRows([])
    setBranch('all')
    setErrors([])
    setFileName('')
  }

  return (
    <div className="min-h-screen bg-amber-50/60 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl text-amber-900">บ้านบรู Dashboard</h1>
            <p className="text-sm text-stone-500">สรุปยอดขายจากไฟล์ CSV</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
            <nav className="flex flex-wrap rounded-lg border border-stone-300 p-0.5">
              {[['dashboard', 'Dashboard'], ['customers', 'ลูกค้า'], ['lab2', 'Lab 2.2'], ['customerLab', 'Lab ลูกค้า'], ['live', 'สด · Firestore'], ['rules', 'ทดสอบ Rules']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`rounded-md px-3 py-1 ${view === key ? 'bg-purple-700 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {rows.length > 0 && (view === 'dashboard' || view === 'lab2') && (
              <>
                <span className="truncate text-stone-500">📄 {fileName}</span>
                <button onClick={reset} className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-50">
                  อัปโหลดไฟล์ใหม่
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:space-y-6 sm:py-6">
        {view === 'customers' && <CustomersPage />}
        {view === 'customerLab' && <CustomerLabPage />}
        {view === 'live' && (isConfigured ? <LiveTab /> : <SetupGuide />)}
        {view === 'rules' && (isConfigured ? <RulesTester /> : <SetupGuide />)}

        {(view === 'dashboard' || view === 'lab2') && rows.length === 0 && (
          <UploadZone onFile={(f) => load(f, f.name)} onSample={loadSample} loading={loading} />
        )}

        {(view === 'dashboard' || view === 'lab2') && errors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">
              ⚠ พบปัญหา {errors.length.toLocaleString('th-TH')} รายการ
              {rows.length > 0 && ' (แถวเหล่านี้ไม่ถูกนำมาคำนวณ)'}
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}
            </ul>
            {errors.length > 5 && <p className="mt-1">…และอีก {errors.length - 5} รายการ</p>}
          </div>
        )}

        {rows.length > 0 && view === 'lab2' && <Lab2Page rows={lab2Rows} products={products} />}

        {rows.length > 0 && view === 'dashboard' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-500">
                ข้อมูลวันที่ {thaiDate(m.dateRange[0], { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
                {thaiDate(m.dateRange[1], { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                {filteredRows.length.toLocaleString('th-TH')} รายการ
              </p>
              {branches.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  สาขา
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="all">ทุกสาขา</option>
                    {branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <KpiCard label="ยอดขายรวม" value={baht(m.totalSales)} note={`เฉลี่ย ${baht(m.totalSales / m.daily.length)} / วัน`} />
              <KpiCard label="จำนวนออเดอร์" value={m.orders.toLocaleString('th-TH')} note={`ขายได้ ${m.itemsSold.toLocaleString('th-TH')} แก้ว/ชิ้น`} />
              <KpiCard label="ยอดเฉลี่ยต่อบิล" value={baht(m.avgPerOrder)} />
              <KpiCard label="วันที่ขายดีที่สุด" value={thaiDate(m.bestDay.date)} note={baht(m.bestDay.sales)} />
            </div>

            <ChartCard title="ยอดขายรายวัน" subtitle="บาท">
              <DailySalesChart data={m.daily} />
            </ChartCard>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <ChartCard title="เมนูขายดี 8 อันดับ" subtitle="เรียงตามยอดขาย (บาท)">
                <TopProductsChart data={m.topProducts} />
              </ChartCard>
              {allMetrics.byBranch.length > 0 && (
                <ChartCard title="ยอดขายตามสาขา" subtitle="ทุกสาขาเทียบกัน (บาท) · ไม่ขึ้นกับตัวกรอง">
                  <TopProductsChart data={allMetrics.byBranch} dataKey="branch" />
                </ChartCard>
              )}
              {m.hourly.length > 0 && (
                <ChartCard title="ยอดขายตามช่วงเวลา" subtitle="รวมทุกวัน (บาท)">
                  <HourlySalesChart data={m.hourly} />
                </ChartCard>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
