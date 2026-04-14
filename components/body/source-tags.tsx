export function SourceTags({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  if (values.length === 0) {
    return null;
  }

  const isUrl = (value: string) => /^https?:\/\//.test(value);

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) =>
          isUrl(value) ? (
            <a
              key={value}
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              {value}
            </a>
          ) : (
            <span
              key={value}
              className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300"
            >
              {value}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
