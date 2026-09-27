import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { baht, compactBaht, thaiDate, SHORT_DATE } from '../lib/metrics'

const BRAND = '#7e22ce' // purple-700
const GRID = '#e7e5e4' // stone-200
const AXIS = { fontSize: 16, fill: '#2c0978' } // stone-500

function TooltipBox({ active, payload, label, formatLabel }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-stone-500">{formatLabel ? formatLabel(label) : label}</p>
      <p className="font-semibold tabular-nums text-stone-900">{baht(payload[0].value)}</p>
      {p.qty !== undefined && <p className="text-stone-500">{p.qty.toLocaleString('th-TH')} แก้ว/ชิ้น</p>}
    </div>
  )
}

export function DailySalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => thaiDate(d, SHORT_DATE)} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={32} />
        <YAxis tickFormatter={compactBaht} tick={AXIS} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          content={<TooltipBox formatLabel={(d) => thaiDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />}
          cursor={{ stroke: '#a8a29e', strokeDasharray: '4 4' }}
        />
        <Line isAnimationActive={false} type="monotone" dataKey="sales" stroke={BRAND} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function TopProductsChart({ data, dataKey = 'product' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={compactBaht} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey={dataKey} tick={{ ...AXIS, fill: '#44403c' }} tickLine={false} axisLine={false} width={96} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: '#f5f5f4' }} />
        <Bar isAnimationActive={false} dataKey="sales" fill={BRAND} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HourlySalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tickFormatter={compactBaht} tick={AXIS} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={<TooltipBox formatLabel={(h) => `ช่วง ${h} น.`} />} cursor={{ fill: '#f5f5f4' }} />
        <Bar isAnimationActive={false} dataKey="sales" fill={BRAND} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
