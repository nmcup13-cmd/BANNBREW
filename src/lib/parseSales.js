import Papa from 'papaparse'

// ชื่อคอลัมน์ที่ยอมรับ (ซ้ายคือชื่อที่ใช้ในโค้ด ขวาคือชื่อที่อาจเจอในไฟล์)
const ALIASES = {
  date: ['date', 'datetime', 'order_date', 'created_at', 'timestamp', 'วันที่'],
  time: ['time', 'order_time', 'เวลา'],
  orderId: ['order_id', 'orderid', 'order_no', 'bill_id', 'receipt_no', 'เลขที่บิล'],
  product: ['product', 'product_name', 'menu', 'item', 'product_id', 'sku', 'สินค้า', 'เมนู'],
  category: ['category', 'หมวด', 'หมวดหมู่'],
  qty: ['qty', 'quantity', 'จำนวน'],
  price: ['price', 'unit_price', 'ราคา', 'ราคาต่อหน่วย'],
  total: ['total', 'amount', 'line_total', 'subtotal', 'ยอดรวม', 'ยอดเงิน'],
  payment: ['payment_method', 'payment', 'ช่องทางชำระ'],
  branch: ['branch', 'store', 'สาขา'],
  channel: ['channel', 'ช่องทาง'],
}

const REQUIRED = [
  ['date', 'date หรือ datetime'],
  ['orderId', 'order_id'],
  ['product', 'product หรือ product_id'],
  ['qty', 'qty'],
]

// หาว่าไฟล์นี้ใช้ชื่อคอลัมน์อะไรสำหรับแต่ละข้อมูล
function mapColumns(fields) {
  const map = {}
  for (const [key, names] of Object.entries(ALIASES)) {
    map[key] = names.find((n) => fields.includes(n))
  }
  return map
}

// แปลงวันที่ให้เป็น YYYY-MM-DD (รองรับ 2026-08-01, 2026-08-01T17:09:07+07:00, 01/08/2026 และปี พ.ศ.)
function normalizeDate(value) {
  const s = String(value ?? '').trim()
  let y, m, d
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) [, y, m, d] = match
  else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) [, d, m, y] = match
  else return null
  let year = Number(y)
  if (year > 2400) year -= 543 // ปี พ.ศ. → ค.ศ.
  const iso = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return Number.isNaN(new Date(iso).getTime()) ? null : iso
}

// ดึงชั่วโมงจากคอลัมน์ time หรือจากส่วนเวลาใน datetime
function getHour(timeValue, dateValue) {
  const t = String(timeValue ?? '').match(/^(\d{1,2}):/)
  if (t) return Number(t[1])
  const dt = String(dateValue ?? '').match(/[T\s](\d{1,2}):\d{2}/)
  return dt ? Number(dt[1]) : NaN
}

// แปลงตัวเลข เช่น "1,250" หรือ "฿65" → 1250, 65
function toNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return NaN
  return Number(String(value).replace(/[,฿\s]/g, ''))
}

const text = (v, fallback = 'ไม่ระบุ') => String(v ?? '').trim() || fallback

// อ่านไฟล์ CSV แล้วคืนค่า { rows, errors, columns }
export function parseSalesFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^﻿/, '').trim().toLowerCase(),
      complete: ({ data, meta }) => {
        const col = mapColumns(meta.fields ?? [])
        const missing = REQUIRED.filter(([k]) => !col[k]).map(([, label]) => label)
        if (!col.total && !col.price) missing.push('total หรือ price/unit_price')
        if (missing.length) {
          resolve({
            rows: [],
            errors: [
              `ไม่พบคอลัมน์: ${missing.join(', ')}`,
              `คอลัมน์ในไฟล์นี้: ${(meta.fields ?? []).join(', ')}`,
            ],
            columns: col,
          })
          return
        }

        const rows = []
        const errors = []
        data.forEach((r, i) => {
          const line = i + 2 // +1 หัวตาราง, +1 เริ่มนับที่ 1
          const rawDate = r[col.date]
          const date = normalizeDate(rawDate)
          const qty = toNumber(r[col.qty])
          let total = col.total ? toNumber(r[col.total]) : NaN
          if (Number.isNaN(total) && col.price) total = qty * toNumber(r[col.price])

          if (!date) errors.push(`แถว ${line}: วันที่ "${rawDate}" ไม่ถูกต้อง`)
          else if (Number.isNaN(qty)) errors.push(`แถว ${line}: จำนวน "${r[col.qty]}" ไม่ใช่ตัวเลข`)
          else if (Number.isNaN(total)) errors.push(`แถว ${line}: ยอดเงินไม่ใช่ตัวเลข`)
          else
            rows.push({
              date,
              hour: getHour(col.time && r[col.time], rawDate),
              orderId: text(r[col.orderId], `row-${line}`),
              product: text(r[col.product]),
              category: text(col.category && r[col.category]),
              qty,
              total,
              payment: text(col.payment && r[col.payment]),
              branch: col.branch ? text(r[col.branch]) : null,
              channel: col.channel ? text(r[col.channel]) : null,
            })
        })
        resolve({ rows, errors, columns: col })
      },
      error: reject,
    })
  })
}
