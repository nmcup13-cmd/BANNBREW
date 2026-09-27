export default function KpiCard({ label, value, note }) {
  return (
    <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <p className="text-xs text-stone-500 sm:text-sm">{label}</p>
      <p className="mt-1 truncate text-xl font-bold tabular-nums text-stone-900 sm:mt-2 sm:text-3xl">{value}</p>
      {note && <p className="mt-1 truncate text-xs text-stone-500 sm:text-sm">{note}</p>}
    </div>
  )
}
