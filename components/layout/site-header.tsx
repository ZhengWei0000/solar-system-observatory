import Link from "next/link";

import { GlobalSearch } from "@/components/search/global-search";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/solar-system", label: "总览" },
  { href: "/learn", label: "学习" },
  { href: "/sources", label: "来源" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl">
      <div className="section-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-lg uppercase tracking-[0.32em] text-slate-50">
            Solar System Observatory
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <GlobalSearch compact />
      </div>
    </header>
  );
}
