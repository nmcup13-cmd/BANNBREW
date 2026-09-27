import { useRef, useState } from 'react'

export default function UploadZone({ onFile, onSample, loading }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed p-6 text-center sm:p-10 transition-colors ${
        dragging ? 'border-amber-600 bg-amber-100' : 'border-stone-300 bg-white'
      }`}
    >
      <p className="text-lg font-semibold text-stone-800">ลากไฟล์ยอดขาย .csv มาวางที่นี่</p>
      <p className="mt-1 text-sm text-stone-500">
        ต้องมีคอลัมน์ date, order_id, product, qty และ total (หรือ price)
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="rounded-lg bg-amber-800 px-5 py-2.5 font-medium text-white hover:bg-amber-900 disabled:opacity-50"
        >
          {loading ? 'กำลังอ่านไฟล์…' : 'เลือกไฟล์'}
        </button>
        <button
          type="button"
          onClick={onSample}
          disabled={loading}
          className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          ลองใช้ข้อมูลตัวอย่าง
        </button>
        <a
          href="/sample-sales.csv"
          download
          className="rounded-lg px-5 py-2.5 font-medium text-amber-800 underline-offset-4 hover:underline"
        >
          ดาวน์โหลดไฟล์ตัวอย่าง
        </a>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
