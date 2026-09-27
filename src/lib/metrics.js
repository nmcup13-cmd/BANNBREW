// คำนวณตัวเลขบนการ์ด KPI
export function computeKpis(rows) {
  // ยอดขายรวม: บวก total ของทุกแถว
  const totalSales = rows.reduce((sum, r) => sum + r.total, 0)

  // จำนวนบิล: นับเลขบิล (order_id) ที่ไม่ซ้ำกัน
  const orderIds = rows.map((r) => r.orderId)
  const uniqueOrderIds = new Set(orderIds)
  const orders = uniqueOrderIds.size

  // จำนวนแก้ว/ชิ้นที่ขายได้: บวก qty ของทุกแถว
  const itemsSold = rows.reduce((sum, r) => sum + r.qty, 0)

  return {
    totalSales,
    orders,
    itemsSold,
    rowCount: rows.length, // จำนวนแถว (รายการสินค้า) เก็บไว้เปรียบเทียบ
    avgPerOrder: orders ? totalSales / orders : 0, // ยอดเฉลี่ยต่อบิล (กันหารด้วย 0)
  }
}

// คำนวณตัวเลขทั้งหมดที่ Dashboard ใช้จากข้อมูลที่อ่านแล้ว
export function computeMetrics(rows) {
  const kpis = computeKpis(rows)

  const sumBy = (keyFn) => {
    const map = new Map()
    rows.forEach((r) => {
      const k = keyFn(r)
      const cur = map.get(k) ?? { sales: 0, qty: 0 }
      cur.sales += r.total
      cur.qty += r.qty
      map.set(k, cur)
    })
    return map
  }

  const daily = [...sumBy((r) => r.date)]
    .map(([date, v]) => ({ date, sales: v.sales }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const topProducts = [...sumBy((r) => r.product)]
    .map(([product, v]) => ({ product, sales: v.sales, qty: v.qty }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8)

  const hasBranch = rows.some((r) => r.branch)
  const byBranch = hasBranch
    ? [...sumBy((r) => r.branch ?? 'ไม่ระบุ')]
        .map(([branch, v]) => ({ branch, sales: v.sales, qty: v.qty }))
        .sort((a, b) => b.sales - a.sales)
    : []

  const hourMap = sumBy((r) => r.hour)
  const hours = [...hourMap.keys()].filter((h) => Number.isFinite(h))
  const hourly = hours.length
    ? Array.from({ length: Math.max(...hours) - Math.min(...hours) + 1 }, (_, i) => {
        const h = Math.min(...hours) + i
        return { hour: `${String(h).padStart(2, '0')}:00`, sales: hourMap.get(h)?.sales ?? 0 }
      })
    : []

  return {
    ...kpis,
    bestDay: daily.reduce((best, d) => (d.sales > (best?.sales ?? -1) ? d : best), null),
    daily,
    topProducts,
    byBranch,
    hourly,
    dateRange: daily.length ? [daily[0].date, daily[daily.length - 1].date] : null,
  }
}

// ยอดขายรายวัน สำหรับ Lab 2.2 · รับ rows ที่มี { date, revenue }
export function dailyRevenue(rows) {
  const map = new Map()
  for (const r of rows) map.set(r.date, (map.get(r.date) ?? 0) + r.revenue)
  return [...map.entries()]
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export const baht = (n) =>
  '฿' + Math.round(n).toLocaleString('th-TH')

export const compactBaht = (n) =>
  n >= 1_000_000
    ? `฿${(n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}M`
    : n >= 1000 ? `฿${(n / 1000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}k` : baht(n)

// วันที่ภาษาไทยแบบย่อ เช่น "1 เม.ย. 68" (ปี พ.ศ. 2 หลัก)
   export const SHORT_DATE = { day: 'numeric', month: 'short', year: '2-digit' }

export const thaiDate = (iso, opts = SHORT_DATE) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', opts)
