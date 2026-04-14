import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section-shell flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="font-display text-4xl text-slate-50">404</div>
      <p className="max-w-lg text-slate-300">未找到对应页面。可能是 slug 不存在，或当前本地快照尚未纳入该对象。</p>
      <Link href="/" className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950">
        返回首页
      </Link>
    </div>
  );
}
