"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useState,
} from "react";

import type { SearchIndexItem } from "@/types";

import { formatBodyType } from "@/lib/utils/format";

import { ModelGradeChip } from "../body/model-grade-chip";
import { cn } from "@/lib/utils/cn";

export function GlobalSearch({
  placeholder = "搜索行星、卫星、别名或系统",
  compact = false,
}: {
  placeholder?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const inputId = useId();

  useEffect(() => {
    if (!deferredQuery.trim()) {
      return;
    }

    let aborted = false;

    startTransition(() => {
      fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`)
        .then((response) => response.json())
        .then((payload: { items: SearchIndexItem[] }) => {
          if (!aborted) {
            setResults(payload.items);
          }
        })
        .catch(() => {
          if (!aborted) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!aborted) {
            setLoading(false);
          }
        });
    });

    return () => {
      aborted = true;
    };
  }, [deferredQuery]);

  const hasResults = results.length > 0;
  const shouldShowPanel = open && (loading || hasResults || Boolean(query.trim()));
  const wrapperClass = compact
    ? "w-full max-w-md"
    : "w-full max-w-2xl";

  const inputClass = cn(
    "w-full rounded-2xl border border-sky-200/15 bg-slate-950/65 pl-12 pr-4 text-slate-100 outline-none transition focus:border-amber-300/45 focus:ring-4 focus:ring-amber-300/10",
    compact ? "h-11 text-sm" : "h-14 text-base",
  );

  return (
    <div className={cn("relative", wrapperClass)}>
      <label htmlFor={inputId} className="sr-only">
        搜索太阳系天体
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <input
        id={inputId}
        value={query}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);

          if (!nextValue.trim()) {
            setResults([]);
            setLoading(false);
          } else {
            setLoading(true);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
          }, 120);
        }}
        placeholder={placeholder}
        className={inputClass}
      />

      {shouldShowPanel ? (
        <div className="glass-panel absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-3xl p-3">
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl px-3 py-4 text-sm text-slate-300">
              <Sparkles className="size-4 text-cyan-300" />
              正在检索本地索引…
            </div>
          ) : hasResults ? (
            <div className="space-y-2">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/body/${item.slug}`}
                  className="block rounded-2xl border border-transparent bg-slate-950/50 px-4 py-3 transition hover:border-cyan-300/30 hover:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {item.names[0]} · {item.names[1]}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {formatBodyType(item.bodyType)}
                        {item.systemNames[0] ? ` · ${item.systemNames[0]}` : ""}
                      </div>
                    </div>
                    <ModelGradeChip grade={item.modelGrade} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.descriptionOneLine}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl px-3 py-4 text-sm text-slate-400">
              未找到匹配结果。试试中文名、英文名、别名或系统名。
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
