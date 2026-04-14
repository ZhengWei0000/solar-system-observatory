export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-panel rounded-3xl p-5">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="mt-3 font-display text-2xl text-slate-50">{value}</div>
      {hint ? <div className="mt-2 text-sm leading-6 text-slate-400">{hint}</div> : null}
    </div>
  );
}
