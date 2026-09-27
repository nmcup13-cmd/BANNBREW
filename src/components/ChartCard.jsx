export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 ${className}`}>
      <h2 className="font-semibold text-stone-900">{title}</h2>
      {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      <div className="mt-4 h-60 sm:h-72">{children}</div>
    </section>
  )
}
