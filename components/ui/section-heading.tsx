export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      {eyebrow ? <div className="text-xs uppercase tracking-[0.32em] text-cyan-300">{eyebrow}</div> : null}
      <h2 className="font-display text-3xl font-semibold tracking-[0.08em] text-slate-50 md:text-4xl">
        {title}
      </h2>
      {description ? <p className="text-base leading-7 text-slate-300">{description}</p> : null}
    </div>
  );
}
