import { useMemo, useState } from 'react'
import UploadZone from './components/UploadZone'
import KpiCard from './components/KpiCard'
import ChartCard from './components/ChartCard'
import { DailySalesChart, TopProductsChart, HourlySalesChart } from './components/charts'
import { parseSalesFile } from './lib/parseSales'
import { computeMetrics, baht, thaiDate } from './lib/metrics'

export default function App() {
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)

  const m = useMemo(() => computeMetrics(rows), [rows])

  const load = async (file, name) => {
    setLoading(true)
    try {
      const result = await parseSalesFile(file)
      setRows(result.rows)
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
          {rows.length > 0 && (
            <div className="flex min-w-0 items-center gap-3 text-sm">
              <span className="truncate text-stone-500">📄 {fileName}</span>
              <button onClick={reset} className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-50">
                อัปโหลดไฟล์ใหม่
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:space-y-6 sm:py-6">
        {rows.length === 0 && (
          <UploadZone onFile={(f) => load(f, f.name)} onSample={loadSample} loading={loading} />
        )}

        {errors.length > 0 && (
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

        {rows.length > 0 && (
          <>
            <p className="text-sm text-stone-500">
              ข้อมูลวันที่ {thaiDate(m.dateRange[0], { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
              {thaiDate(m.dateRange[1], { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
              {rows.length.toLocaleString('th-TH')} รายการ
            </p>

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
              {m.byBranch.length > 0 && (
                <ChartCard title="ยอดขายตามสาขา" subtitle="บาท">
                  <TopProductsChart data={m.byBranch} dataKey="branch" />
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
