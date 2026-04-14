import { cn } from "@/lib/utils/cn";

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-sky-200/10 bg-slate-950/40 px-3 py-1 text-xs font-medium text-slate-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
