// หน้าข้อมูลลูกค้า (สมาชิก) · โหลด public/customers.csv และ public/sales.csv เอง ไม่ต้องอัปโหลดไฟล์
// ข้อมูลลูกค้าผ่าน data profiling แล้ว (Lab2_1_Customers_Profiling.ipynb) และไม่มีชื่อเล่น/เบอร์โทรในไฟล์ที่เผยแพร่
import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/ChartCard'
import { baht } from '../lib/metrics'

const BRAND = '#7e22ce' // สีหลักเดียวกับ Dashboard
const MUTED = '#d8b4fe' // สีเดียวกันแต่อ่อน ใช้บอกข้อมูลไม่ครบ
const GRID = '#e7e5e4'
const AXIS = { fontSize: 13, fill: '#44403c' }
const TIP = { borderRadius: 8, fontSize: 13 }

// คู่จับรหัสสาขา → ชื่อสาขา (หาได้จากขั้นที่ 7 ของ notebook: สาขาที่สมาชิกแต่ละรหัสซื้อบ่อยที่สุด)
const BRANCH_NAME = { B01: 'สยาม', B02: 'สีลม', B03: 'อารีย์', B04: 'บางนา', B05: 'มหาวิทยาลัย' }
const AGE_ORDER = ['ต่ำกว่า 18', '18-24', '25-34', '35-44', '45-54', '55+']
const FREQ_BUCKETS = [
  { label: 'ไม่เคย', min: 0, max: 0 },
  { label: '1', min: 1, max: 1 },
  { label: '2–3', min: 2, max: 3 },
  { label: '4–6', min: 4, max: 6 },
  { label: '7–10', min: 7, max: 10 },
  { label: '11+', min: 11, max: Infinity },
]

const num = (n) => Math.round(n).toLocaleString('th-TH')
const pct = (x) => `${(x * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`
const thaiMonth = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
const median = (arr) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

async function fetchCsv(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`)
  const text = (await res.text()).replace(/^\uFEFF/, '')
  return Papa.parse(text, { header: true, skipEmptyLines: 'greedy' }).data
}

function computeCustomerMetrics(customers, sales) {
  // 1) รวมยอดเป็นรายบิล แล้วผูกกับ customer_id (บิลที่ไม่ระบุสมาชิกมี customer_id ว่าง)
  const bills = new Map()
  for (const r of sales) {
    const b = bills.get(r.order_id) ?? { customer: r.customer_id ?? '', total: 0 }
    b.total += Number(r.qty) * Number(r.unit_price)
    bills.set(r.order_id, b)
  }
  const perCustomer = new Map()
  let memberBills = 0
  for (const b of bills.values()) {
    if (!b.customer) continue
    memberBills++
    const p = perCustomer.get(b.customer) ?? { bills: 0, spend: 0 }
    p.bills++
    p.spend += b.total
    perCustomer.set(b.customer, p)
  }

  // 2) ข้อมูลรายคน (รวมคนที่ไม่เคยซื้อ = 0)
  const people = customers.map((c) => ({
    ...c,
    bills: perCustomer.get(c.customer_id)?.bills ?? 0,
    spend: perCustomer.get(c.customer_id)?.spend ?? 0,
  }))
  const buyers = people.filter((p) => p.bills > 0)

  // 3) สมาชิกใหม่รายเดือน (เดือนสุดท้ายอาจไม่ครบ)
  const byMonth = new Map()
  let lastJoin = ''
  for (const p of people) {
    const ym = p.joined_date.slice(0, 7)
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + 1)
    if (p.joined_date > lastJoin) lastJoin = p.joined_date
  }
  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))
  const lastMonth = monthly.at(-1)
  if (lastMonth) {
    lastMonth.days = Number(lastJoin.slice(8, 10))
    lastMonth.partial = lastMonth.days < daysInMonth(lastMonth.month)
  }

  // 4) จัดกลุ่มตามหมวดหมู่
  const groupBy = (key, order) => {
    const map = new Map()
    for (const p of people) {
      const g = map.get(p[key]) ?? { name: p[key], count: 0, spend: 0 }
      g.count++
      g.spend += p.spend
      map.set(p[key], g)
    }
    const list = [...map.values()].map((g) => ({ ...g, avgSpend: g.spend / g.count, share: g.count / people.length }))
    return order
      ? list.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
      : list.sort((a, b) => b.count - a.count)
  }
  const byAge = groupBy('age_group', AGE_ORDER)
  const byGender = groupBy('gender')
  const byBranch = groupBy('home_branch_id').map((g) => ({ ...g, name: BRANCH_NAME[g.name] ?? g.name }))

  const freq = FREQ_BUCKETS.map((f) => {
    const count = people.filter((p) => p.bills >= f.min && p.bills <= f.max).length
    return { name: f.label, count, share: count / people.length }
  })

  return {
    total: people.length,
    buyers: buyers.length,
    memberBills,
    allBills: bills.size,
    avgSpend: buyers.reduce((s, p) => s + p.spend, 0) / (buyers.length || 1),
    medianSpend: median(buyers.map((p) => p.spend)),
    avgBills: buyers.reduce((s, p) => s + p.bills, 0) / (buyers.length || 1),
    medianBills: median(buyers.map((p) => p.bills)),
    monthly,
    byAge,
    byGender,
    byBranch,
    freq,
  }
}

// ---------- กราฟพื้นฐาน: แท่งสีเดียว ----------
function Bars({ data, dataKey, nameKey = 'name', vertical = false, format = num, tooltipLabel, colorOf }) {
  const label = { fontSize: 12, fill: '#44403c' }
  const many = !vertical && data.length > 8 && typeof window !== 'undefined' && window.innerWidth < 640
  const tooltip = (
    <Tooltip
      formatter={(v, _n, item) => [
        `${format(v)}${item.payload.share !== undefined ? ` (${pct(item.payload.share)})` : ''}`,
        tooltipLabel,
      ]}
      contentStyle={TIP}
      cursor={{ fill: '#f5f5f4' }}
    />
  )
  return (
    <ResponsiveContainer width="100%" height="100%">
      {vertical ? (
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 72 }}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey={nameKey} width={92} tick={AXIS} tickLine={false} axisLine={false} />
          {tooltip}
          <Bar dataKey={dataKey} fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey={dataKey} position="right" formatter={format} style={label} />
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={nameKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }}
                 interval={many ? 'preserveStartEnd' : 0} minTickGap={many ? 12 : 0} />
          <YAxis tick={AXIS} tickFormatter={format} tickLine={false} axisLine={false} width={64} />
          {tooltip}
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={colorOf ? colorOf(d) : BRAND} />)}
            {!many && <LabelList dataKey={dataKey} position="top" formatter={format} style={label} />}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

export default function CustomersPage() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCsv('/customers.csv'), fetchCsv('/sales.csv')])
      .then(([customers, sales]) => !cancelled && setState({ status: 'ready', customers, sales }))
      .catch((err) => !cancelled && setState({ status: 'error', message: err.message }))
    return () => { cancelled = true }
  }, [])

  const m = useMemo(
    () => (state.status === 'ready' ? computeCustomerMetrics(state.customers, state.sales) : null),
    [state],
  )

  if (state.status === 'loading') return <p className="text-stone-500">กำลังโหลดข้อมูลลูกค้า…</p>
  if (state.status === 'error') return <p className="text-red-700">โหลดข้อมูลไม่สำเร็จ: {state.message}</p>

  // ---------- ข้อความสรุปเหนือกราฟ (คำนวณจากข้อมูลจริงทั้งหมด) ----------
  const last = m.monthly.at(-1)
  const prev = m.monthly.at(-2)
  const peakMonth = m.monthly.reduce((a, b) => (b.count > a.count ? b : a))
  const monthlyNote = last?.partial
    ? `สูงสุด ${thaiMonth(peakMonth.month)} ${num(peakMonth.count)} คน · ${thaiMonth(last.month)} มีข้อมูลถึงวันที่ ${last.days} จึงยังไม่ครบเดือน (สีอ่อน) ` +
      `· ถ้าครบเดือนคาด ≈ ${num((last.count / last.days) * daysInMonth(last.month))} คน`
    : `สูงสุด ${thaiMonth(peakMonth.month)} ${num(peakMonth.count)} คน · เดือนล่าสุด ${num(last.count)} คน (เดือนก่อน ${num(prev?.count ?? 0)})`

  const lowFreq = m.freq[0].count + m.freq[1].count
  const highFreq = m.freq.at(-1)
  const freqNote = `${pct(lowFreq / m.total)} ไม่เคยซื้อหรือซื้อครั้งเดียว · ขาประจำ (11 ครั้งขึ้นไป) ${num(highFreq.count)} คน (${pct(highFreq.share)})`

  const biggestAge = [...m.byAge].sort((a, b) => b.count - a.count)[0]
  const ageNote = `กลุ่มใหญ่สุดคือ ${biggestAge.name} ปี ${num(biggestAge.count)} คน (${pct(biggestAge.share)}) · อายุ 18–34 รวม ${pct(
    m.byAge.filter((a) => a.name === '18-24' || a.name === '25-34').reduce((s, a) => s + a.share, 0),
  )}`

  const topSpendAge = [...m.byAge].sort((a, b) => b.avgSpend - a.avgSpend)[0]
  const lowSpendAge = [...m.byAge].sort((a, b) => a.avgSpend - b.avgSpend)[0]
  const spendNote = `${topSpendAge.name} ปี ใช้จ่ายเฉลี่ยสูงสุด ${baht(topSpendAge.avgSpend)}/คน · ต่ำสุด ${lowSpendAge.name} ปี ${baht(lowSpendAge.avgSpend)}/คน`

  const topBranch = m.byBranch[0]
  const lowBranch = m.byBranch.at(-1)
  const branchNote = `${topBranch.name} มีสมาชิกมากสุด ${num(topBranch.count)} คน · ${lowBranch.name} น้อยสุด ${num(lowBranch.count)} คน`

  const genderNote = m.byGender.map((g) => `${g.name} ${pct(g.share)}`).join(' · ')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-900">ข้อมูลลูกค้า (สมาชิก)</h2>
        <p className="text-sm text-stone-500">
          สมาชิก {num(m.total)} คน · เทียบกับยอดขาย {num(m.allBills)} บิล · ข้อมูลผ่านการ profiling แล้ว
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="สมาชิกทั้งหมด" value={num(m.total)} note={`เคยซื้อ ${num(m.buyers)} คน (${pct(m.buyers / m.total)})`} />
        <KpiCard label="บิลที่เป็นสมาชิก" value={pct(m.memberBills / m.allBills)} note={`${num(m.memberBills)} จาก ${num(m.allBills)} บิล`} />
        <KpiCard label="ยอดซื้อสะสมต่อสมาชิก" value={baht(m.avgSpend)} note={`ค่ากลาง ${baht(m.medianSpend)} (เฉพาะคนที่เคยซื้อ)`} />
        <KpiCard label="ซื้อเฉลี่ยต่อคน" value={`${m.avgBills.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ครั้ง`} note={`ค่ากลาง ${num(m.medianBills)} ครั้ง`} />
      </div>

      <ChartCard title="สมาชิกใหม่รายเดือน" subtitle={monthlyNote}>
        <Bars
          data={m.monthly.map((d) => ({ ...d, name: thaiMonth(d.month) }))}
          dataKey="count"
          tooltipLabel="สมาชิกใหม่ (คน)"
          colorOf={(d) => (d.partial ? MUTED : BRAND)}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard title="ความถี่การซื้อของสมาชิก (จำนวนครั้งที่ซื้อ)" subtitle={freqNote}>
          <Bars data={m.freq} dataKey="count" tooltipLabel="สมาชิก (คน)" />
        </ChartCard>
        <ChartCard title="สมาชิกตามช่วงอายุ" subtitle={ageNote}>
          <Bars data={m.byAge} dataKey="count" tooltipLabel="สมาชิก (คน)" />
        </ChartCard>
        <ChartCard title="ยอดซื้อเฉลี่ยต่อสมาชิก ตามช่วงอายุ" subtitle={spendNote}>
          <Bars data={m.byAge} dataKey="avgSpend" format={baht} tooltipLabel="ยอดซื้อเฉลี่ย/คน (รวมคนที่ยังไม่เคยซื้อ)" />
        </ChartCard>
        <ChartCard title="สมาชิกตามสาขาประจำ" subtitle={branchNote}>
          <Bars data={m.byBranch} dataKey="count" vertical tooltipLabel="สมาชิก (คน)" />
        </ChartCard>
        <ChartCard title="สมาชิกตามเพศ" subtitle={genderNote}>
          <Bars data={m.byGender} dataKey="count" vertical tooltipLabel="สมาชิก (คน)" />
        </ChartCard>
      </div>

      <p className="text-xs text-stone-500">
        หมายเหตุ: ยอดซื้อนับเฉพาะบิลที่ระบุ customer_id · รหัสสาขาประจำ B01–B05 จับคู่กับชื่อสาขาจากพฤติกรรมการซื้อจริง ·
        ไฟล์ที่เผยแพร่บนเว็บไม่มีชื่อเล่นและเบอร์โทร
      </p>
    </div>
  )
}
